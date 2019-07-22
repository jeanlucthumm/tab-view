const {src, dest} = require('gulp');
const sass = require('gulp-sass');

function make_sass() {
  return src('*.scss')
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(dest('.'));
}

exports.default = make_sass;
