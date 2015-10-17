var path = require('path');
var fs = require('fs');
var EOL = require('os').EOL;

var through = require('through2');
var gutil = require('gulp-util');
var rev = require('gulp-rev');

module.exports = function (options) {
	options = options || {}; // cssmin, htmlmin, jsmin

	var SECTION_START_REGEX = /<!--\s*build:(css|js)(?:\(([^\)]+?)\))?\s+(\/?([^\s]+?))\s*-->/gim;
	var SECTION_END_REGEX   = /<!--\s*endbuild\s*-->/gim;
	var SECTION_JS_REGEX    = /<\s*script\s+.*?src\s*=\s*"([^"]+?)".*?><\s*\/\s*script\s*>/gi;
	var SECTION_CSS_REGEX   = /<\s*link\s+.*?href\s*=\s*"([^"]+)".*?>/gi;

	var section_regex = {
		js : SECTION_JS_REGEX,
		css: SECTION_CSS_REGEX
	}

	function createSection(section) {
		return {
			original     : section[0], // ? always empty?
			fileType     : section[1], // x
			alternatePath: section[2], // x
			outName      : section[3], // ?
			outName      : section[4], // ?
			content      : section[5]  // x
		}
	}

	// function createFile(name, content, asset) {
	// 	var filepath = path.join(path.relative(basePath, mainPath), name)

	// 	if (asset === true && options.assetsDir)
	// 	{
	// 		filepath = path.relative(basePath,path.join(options.assetsDir,filepath));
	// 	}

	// 	return new gutil.File({
	// 		path: filepath,
	// 		contents: new Buffer(content)
	// 	});
	// }

	// function concat(content, reg, delimiter) {
	// 	var paths = [];
	// 	var buffer = [];

	// 	content
	// 		.replace(/<!--(?:(?:.|\r|\n)*?)-->/gim, '')
	// 		.replace(reg, function (a, b) {
	// 			paths.push(path.resolve(path.join(alternatePath || mainPath, b)));
	// 		});

	// 	for (var i = 0, l = paths.length; i < l; ++i)
	// 		buffer.push(fs.readFileSync(paths[i]));

	// 	return buffer.join(delimiter);
	// }

	// function write(files, processor, callback) {
	// 	if (processor) {
	// 		processor.on('data', callback);

	// 		files.forEach(function(file) {
	// 			processor.write(file);
	// 		});

	// 		processor.removeListener('data', callback);
	// 	}
	// 	else
	// 		files.forEach(callback);
	// }

	function getSectionFiles(section, reg, state) {
		var files = [];

		processFilePath = function(a, b) {
			filePath    = path.join(state.alternatePath || state.mainPath, b)
			fileContent = new Buffer(fs.readFileSync(filePath));

			files.push(new gutil.File({
				path    : b,
				contents: fileContent
			}));
		}

		section.content
			.replace(/<!--(?:(?:.|\r|\n)*?)-->/gim, '')
			.replace(reg, processFilePath)

		return files
	}

	function transformSectionRefs(section, sectionRefs) {
		finalRefs = []

		function onFinalRef(file) {
			finalRefs.push(file)
		}

		options.jsmin.on('data', onFinalRef)

		sectionRefs.forEach(function(file) {
			options.jsmin.write(file);
		})

		options.jsmin.removeListener('on', onFinalRef)
		return finalRefs
	}

	function processHtml(file) {
		var state = {
			basePath: file.base,
			mainPath: path.dirname(file.path),
			mainName: path.basename(file.path),
		}

		var result      = [];
		var content     = String(file.contents);
		var sectionsRaw = content.split(SECTION_END_REGEX);

		for (var i = 0; i < sectionsRaw.length; i++) {

			// Not a valid section, append to result
			if (!sectionsRaw[i].match(SECTION_START_REGEX)) {
				result.push(sectionsRaw[i]);
				continue;
			}

			var sectionRaw  = sectionsRaw[i].split(SECTION_START_REGEX);
			var section     = createSection(sectionRaw);
			var sectionRefs = getSectionFiles(section, section_regex[section.fileType], state)
			var finalRefs   = transformSectionRefs(section, sectionRefs)

			// console.log('Discovered section: ', section.outName)
			// console.log('Section files: ', sectionRefs)
			// console.log('Transformed files: ', finalRefs)

			result.push(section.original)

			for (var l = 0; l < finalRefs.length; l++) {
				result.push('<script src="' + finalRefs[l].path + '"></script>' + EOL);
			}
		}

		// console.log('Final: ', result)

		return new gutil.File({
			path    : path.join(path.relative(state.basePath, state.mainPath), state.mainName),
			contents: new Buffer(result.join(''))
		})
	}

	return through.obj(function (file, enc, callback) {

		if (file.isNull()) {
			this.push(file);
			callback();
			return;
		}

		if (file.isStream()) {
			this.emit('error', new gutil.PluginError('gulp-indexpipe', 'Streams are not supported!'));
			callback();
			return
		}

		var result = processHtml(file);
		this.push(result);
		callback();
	});
};
