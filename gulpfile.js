var pump = require('pump');
var gulp = require('gulp');

// gulp plugins
var sourcemaps = require('gulp-sourcemaps');
var replace = require('gulp-replace');

// gulp for JavaScript
var babel  = require('gulp-babel');


/* gulp とコマンドを打つと実行される */
gulp.task('default', ['watch'] );

/* gulp watch */
gulp.task('watch', function() {
	gulp.watch(['source/**/*.js'], ['deploy']);
});

/* deploy : babel して console.log の行は消す */
gulp.task('deploy', function(callback) {
	pump([
		gulp.src('source/**/*.js'),
		replace(/\t/g, '  '), // babel でネストが深くなるのでタブ文字を2文字スペースに
		babel({
			presets: ['es2015']
		}),
		replace(/^.*console\.log.*$\n/gm, ''), // console.log のある行を削除
		gulp.dest('./')
	], callback);
});

/* dev-deploy : sourcemap 働かせつつ babel */
gulp.task('dev-deploy', function(callback) {
	pump([
		gulp.src('source/**/*.js'),
		sourcemaps.init(),
		replace(/\t/g, '  '), // babel でネストが深くなるのでタブ文字を2文字スペースに
		babel({
			presets: ['es2015']
		}),
		sourcemaps.write(),
		gulp.dest('./dev-dest/')
	], callback);
});
