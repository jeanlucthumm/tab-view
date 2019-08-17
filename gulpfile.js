const {src, dest, parallel} = require('gulp');
const sass = require('gulp-sass');
const clean = require('gulp-clean');

const out = './build';

function css() {
  return src('*.scss')
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(dest(out));
}

function js() {
  return src('*.js')
    .pipe(dest(out));
}

function html() {
  return src('*.html')
    .pipe(dest(out));
}

function resources() {
  return src(['./icon/**/*', './images/**/*', './manifest.json'],
    {base: '.'})
    .pipe(dest(out));
}

function cleanBuild() {
  return src(out + '/**/*', {read: false})
    .pipe(clean());
}


exports.default = parallel(css, js, html, resources);
exports.clean = cleanBuild;
