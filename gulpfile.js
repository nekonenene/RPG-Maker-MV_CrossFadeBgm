const pump = require('pump');
const gulp = require('gulp');

// gulp plugins
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');

// gulp for JavaScript
const babel = require('gulp-babel');

/* deploy : babel して console.log の行は消す */
gulp.task('deploy', function(callback) {
  pump([
    gulp.src('source/**/*.js'),
    replace(/^.*console\.log.*$\n/gm, ''), // console.log のある行を削除
    babel({
      presets: ['@babel/env'],
      minified: true,
    }),
    gulp.dest('./')
  ], callback);
});

/* dev-deploy : sourcemap 働かせつつ babel */
gulp.task('dev-deploy', function(callback) {
  pump([
    gulp.src('source/**/*.js'),
    sourcemaps.init(),
    babel({
      presets: ['@babel/env']
    }),
    sourcemaps.write(),
    gulp.dest('./dev-dest/')
  ], callback);
});

/* gulp watch */
gulp.task('watch', function () {
  gulp.watch(['source/**/*.js'], gulp.parallel('deploy', 'dev-deploy'));
});

/* gulp とコマンドを打つと実行される */
gulp.task('default', gulp.parallel('watch'));
