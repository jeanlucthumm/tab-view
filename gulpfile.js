const {src, dest, parallel} = require('gulp');
const sass = require('gulp-sass');
const clean_ = require('gulp-clean');

function html() {
  return src(['sample.html'])
    .pipe(dest('output/'));
}

function css() {
  return src(['style.scss'])
    .pipe(sass().on('error', sass.logError))
    .pipe(dest('output/'));
}

function js() {
  return src(['sample.js'])
    .pipe(dest('output/'));
}

function clean() {
  return src('output/*')
    .pipe(clean_());
}

exports.default = parallel(html, css, js);
exports.clean = clean;

