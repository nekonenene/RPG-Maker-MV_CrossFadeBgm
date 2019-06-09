const pump = require('pump');
const gulp = require('gulp');

// gulp plugins
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');

// gulp for JavaScript
const babel = require('gulp-babel');

/* deploy : console.log の行を消したのち babel */
gulp.task('deploy', function(callback) {
  pump([
    gulp.src('source/**/*.js'),
    replace(/^.*console\.log.*$\n/gm, ''), // console.log のある行を削除
    babel({
      presets: ['@babel/preset-env'],
      minified: true,
    }),
    gulp.dest('./')
  ], callback);
});

/* dev-deploy : sourcemap を働かせつつ babel */
gulp.task('dev-deploy', function(callback) {
  pump([
    gulp.src('source/**/*.js'),
    sourcemaps.init(),
    babel({
      presets: ['@babel/preset-env']
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
