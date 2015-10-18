/* jshint node: true */
/* global describe, it */

'use strict';

var assert      = require('assert');
var fs          = require('fs');
var gutil       = require('gulp-util');
var PassThrough = require('stream').PassThrough;
var through     = require('through2');
var path        = require('path');
var indexpipe   = require('../index');

var jsmin   = require('gulp-uglify');
var htmlmin = require('gulp-minify-html');
var cssmin  = require('gulp-minify-css');

function onceStream(output) {
  var reduced = false;
  return through.obj(function (file, enc, callback) {
    if(reduced)
      return;
    this.push(output);
    callback();
    reduced = true;
  });
}

function onceFileStream(path) {
  return onceStream(new gutil.File({path: path, contents: ''}));
}

function getFile(filePath) {
  return new gutil.File({
    path:     filePath,
    base:     path.dirname(filePath),
    contents: fs.readFileSync(filePath)
  });
}

function getActual(filePath) {
  return getFile(path.join('test', 'fixtures', filePath));
}

function getExpected(filePath) {
  return getFile(path.join('test', 'expected', filePath));
}

function compare(actualName, expectedName, args, done) {

  function onData(file) {
    if (path.basename(file.path) !== actualName)
      throw('Wrong file emitted: ' + file.path + ' !== ' + actualName);

    var expectedContent = String(getExpected(expectedName).contents);
    var actualContent   = String(file.contents);
    assert.equal(expectedContent, actualContent);
  }

  function onEnd() {
    done();
  }

  var stream = indexpipe(args);
  stream.on('data', onData);
  stream.on('end', onEnd);
  stream.write(getActual(actualName));
  stream.end();
}

describe('gulp-indexpipe', function() {

  it('should pass identity transform paths', function(done) {
    var args = {
      scripts: new PassThrough({objectMode: true}),
      styles : new PassThrough({objectMode: true})
    };

    compare('identity.html', 'identity.html', args, done);
  });

  it('should reduce paths', function(done) {
    var args = {
      scripts: onceFileStream('app.js'),
      styles : onceFileStream('vendor.css')
    };

    compare('transform.html', 'transform.html', args, done);
  });

  it('should use alternate paths', function(done) {
    var args = {
      scripts: new PassThrough({objectMode: true}),
      styles : new PassThrough({objectMode: true})
    };

    compare('alternate.html', 'identity.html', args, done);
  });

  it('section identity', function(done) {
    var args = {
      one: new PassThrough({ objectMode: true }),
      two: new PassThrough({ objectMode: true })
    };

    compare('multiple.html', 'multiple.html', args, done);
  });
});
