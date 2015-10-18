# gulp-indexpipe

![build status](https://travis-ci.org/NullSoldier/gulp-indexpipe.svg)

**This readme is still under construction and is not gauranteed to be correct**

This task is designed for gulp 3. Was based off of https://github.com/pursual/gulp-usemin

gulp-indexpipe reads sections from an index file, does processing in gulp, and writes the file references back into the block after you are finished.

This lets you do many things that gulp-usemin will not allow you to do such as separate your debug and release build processes in gulp in a very clean way.

Consider the example usage example below...

## Usage Example

This is a standard looking index file. You have some vendor dependencies, scripts, and styles. When you make a debug build, the file references that should be listed will be very different than when you perform a release build. Let's see how that works below...

```html
<head>
  <!-- build:css styles-->
  <link rel="stylesheet" type="text/css" href="style/home.css">
  <link rel="stylesheet" type="text/css" href="style/about.css">
  <!-- endbuild -->
</head>

<body>
  <!-- build:js vendor-->
  <script src="vendor/angular.min.js"></script>
  <script src="vendor/bootstrap.min.js"></script>
  <!-- endbuild -->

  <!-- build:js scripts -->
  <script src="src/app.js"></script>
  <script src="src/utils.js"></script>
  <!-- endbuild -->
</body>
```

Now here is what your build process might look like using gulp-indexpipe. in gulp. Note that there is no concatenation or minifaction going on. It's building source maps and simply copying files to your output directory for fastest iteration time.

When you use gulp.dest in gulp-indexpipe., gulp-indexpipe. will take the resulting references and copy them back into the index file where they came from. In the case of a debug build, this is an identity operation.

```javascript
gulp.task('build-debug', function() {

  gulp.src('index.html')
    buildScripts = sourcemaps.init()
      .pipe(coffee())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build'))

    buildVendor = gulp.dest('build')
    buildStyles = gulp.dest('build')

    indexpipe({
      scripts: buildScripts,
      vendor : buildVendor,
      styles : buildStyles
    })).pipe(gulp.dest('build/'));
});
```

This is what your release build might look like. Note that minification and concatenation is happening which reduces the file references in the stream to a single file. Once gulp-indexpipe. sees the single file from each build process, it copies that into the block from which the file references came from.

Look below to see what the resulting index.html file will look like as output from gulp-indexpipe.

```javascript
gulp.task('build-release', function() {

  gulp.src('index.html')
    buildScripts = coffee()
      .pipe(ngAnnotate())
      .pipe(uglify())
      .pipe(concat('scripts.js')
      .pipe(gulp.dest('build'))

    buildVendor = concat('vendor.js')
      .pipe(gulp.dest 'build')

    buildStyles = minifyCss()
      .pipe(concat('styles.css')
      .pipe(gulp.dest('build')

    indexpipe({
      scripts: buildScripts,
      vendor : buildVendor,
      styles : buildStyles
    })).pipe(gulp.dest('build/'));
});
```

```html
<head>
  <link rel="stylesheet" type="text/css" href="styles.css">
</head>

<body>
  <script src="vendor.js"></script>
  <script src="scripts.js"></script>
</body>
```
## API

### Blocks
Blocks are expressed as:

```html
<!-- build:<type>(alternate search path) <name> -->
... HTML Markup, list of script / link tags.
<!-- endbuild -->
```

- **type**: either `js` or `css`
- **alternate search path**: (optional) By default the input files are relative to the treated file. Alternate search path allows one to change that
- **name**: the name of the section to be references in your gulpfile
