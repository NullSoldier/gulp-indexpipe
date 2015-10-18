var path = require('path');
var fs = require('fs');
var EOL = require('os').EOL;

var through = require('through2');
var gutil = require('gulp-util');
var rev = require('gulp-rev');

module.exports = function (options) {
  options = options || {};

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
      name         : section[4], // NEW
      original     : section[0], // ? always empty?
      fileType     : section[1], // x
      alternatePath: section[2], // x
      outName      : section[3], // ?
      outName      : section[4], // ?
      content      : section[5]  // x
    }
  }

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
    processor = options[section.name]

    if (processor) {
      function onFinalRef(file) {
        finalRefs.push(file)
      }

      processor.on('data', onFinalRef)
      sectionRefs.forEach(function(file) {
        processor.write(file);
      })
      processor.removeListener('on', onFinalRef)
    }

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

      result.push(section.original)

      refSource = []
      for (var l = 0; l < finalRefs.length; l++) {
        refSource.push('<script src="' + finalRefs[l].path + '"></script>');
      }
      result.push(refSource.join('\n'))
    }

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

    this.push(processHtml(file));
    callback();
  });
};
