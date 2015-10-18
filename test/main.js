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

  it('section identity', function(done) {
    var args = {
      jsmin: new PassThrough({objectMode: true})
    };

    compare('simple-identity.html', 'simple-identity.html', args, done);
  });

  it('section transform', function(done) {
    var reduced = false
    var args = {
      jsmin: through.obj(function (file, enc, callback) {
        if(reduced)
          return
        this.push(new gutil.File({
          path    : 'app.js',
          contents: ''
        }));
        callback();
        reduced = true
      })
    };

    compare('simple-transform.html', 'simple-transform.html', args, done);
  });
});
