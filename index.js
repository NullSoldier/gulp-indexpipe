var path  = require('path');
var fs    = require('fs');
var EOL   = require('os').EOL;
var async = require('async');

var through = require('through2');
var gutil   = require('gulp-util');

module.exports = function (options) {
  options = options || {};

  var SECTION_START_REGEX = /<!--\s*build:(css|js)(?:\(([^\)]+?)\))?\s+(\/?([^\s]+?))\s*-->/gim;
  var SECTION_END_REGEX   = /<!--\s*endbuild\s*-->/gim;
  var SECTION_JS_REGEX    = /<\s*script\s+.*?src\s*=\s*"([^"]+?)".*?><\s*\/\s*script\s*>/gi;
  var SECTION_CSS_REGEX   = /<\s*link\s+.*?href\s*=\s*"([^"]+)".*?>/gi;

  var fileRegex = {
    js : SECTION_JS_REGEX,
    css: SECTION_CSS_REGEX
  }

  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
          position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
  }

  function createSection(section) {
    return {
      name         : section[4],
      original     : section[0],
      fileType     : section[1],
      alternatePath: section[2],
      outName      : section[3],
      content      : section[5]
    }
  }

  function fileToRef(file) {
    if(file.path.endsWith('.js')) {
      return '<script src="' + file.path + '"></script>';
    }
    else if(file.path.endsWith('.css')) {
      return '<link rel="stylesheet" href="' + file.path + '"/>';
    }
    throw 'File type not supported for ' + file.path
  }

  function parseSectionFiles(section, reg, pathInfo) {
    var files = [];

    processFilePath = function(a, b) {
      filePath    = path.join(pathInfo.alternatePath || pathInfo.mainPath, b)
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

  function transformSectionFiles(section, files, onTaskDone) {
    var processor = options[section.name]
    var result    = []

    if (!processor) {
      onTaskDone(null, [section.content])
      return
    }

    function onData(file) {
      result.push(fileToRef(file))
    }

    function onEnd() {
      processor.removeListener('on', onData)
      onTaskDone(null, section.original + result.join('\n'))
    }

    processor.on('data', onData)
    processor.on('end', onEnd)
    files.forEach(processor.write.bind(processor))
    processor.end();
  }

  function processHtml(file, pathInfo, onDone) {

    var sectionsRaw = String(file.contents).split(SECTION_END_REGEX);
    var resultTasks    = [];

    sectionsRaw.forEach(function(sectionRaw) {
      resultTasks.push(function(onTaskDone) {

        // Not a valid section, append to result
        if (!sectionRaw.match(SECTION_START_REGEX)) {
          onTaskDone(null, sectionRaw)
          return
        }

        var section      = createSection(sectionRaw.split(SECTION_START_REGEX));
        var sectionFiles = parseSectionFiles(section, fileRegex[section.fileType], pathInfo);
        transformSectionFiles(section, sectionFiles, onTaskDone);
      });
    });

    async.parallel(resultTasks, function(err, results) {
      onDone(results.join(''))
    });
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

    var pathInfo = {
      basePath: file.base,
      mainPath: path.dirname(file.path),
      mainName: path.basename(file.path),
    }

    function onDone(content) {
      var file = new gutil.File({
        path    : path.join(path.relative(pathInfo.basePath, pathInfo.mainPath), pathInfo.mainName),
        contents: new Buffer(content)
      })

      this.push(file)
      callback();
    }

    processHtml(file, pathInfo, onDone.bind(this));
  });
};
