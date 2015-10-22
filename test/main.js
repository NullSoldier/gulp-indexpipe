/* jshint node: true */
/* global describe, it */

'use strict';

var assert      = require('assert');
var fs          = require('fs');
var gutil       = require('gulp-util');
var PassThrough = require('stream').PassThrough;
var Duplex      = require('stream').Duplex;
var through     = require('through2');
var path        = require('path');
var indexpipe   = require('../index');

var jsmin   = require('gulp-uglify');
var htmlmin = require('gulp-minify-html');
var cssmin  = require('gulp-minify-css');

function asyncStream() {
  return through.obj(function (file, enc, callback) {
    process.nextTick(function() {
      this.push(file);
      callback()
    }.bind(this))
  });
}

function onceStream(output) {
  var stream =  through.obj(function (file, enc, callback) { callback() });
  stream.once('finish', function() {
    stream.emit('data', output);
    this.end();
  })
  return stream
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

  it('should wait for async transforms', function(done) {
    var args = {
      scripts: asyncStream(),
      styles : asyncStream(),
    };

    compare('identity.html', 'identity.html', args, done);
  });

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

  it('should process multiple blocks of the same type', function(done) {
    var args = {
      one: new PassThrough({ objectMode: true }),
      two: new PassThrough({ objectMode: true })
    };

    compare('multiple.html', 'multiple.html', args, done);
  });
});
