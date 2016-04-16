/**
 * Created by steven on 16/4/16.
 */

var parseArgs = require('minimist');

var argv = parseArgs((process.argv.slice(2)));

var spawn = require('child_process').spawn;

// var ps = spawn('casperjs', [__dirname + '/updateProvincesConf.js', argv.type].concat(argv._));
// ps.stdout.on('data', function (data) {
//     console.log(data.toString().replace("\n", ""));
// });
// ps.stderr.on('data', function (data) {
//     console.log(data.toString().replace("\n", ""));
// });
// ps.on('exit', function () {
//     console.log('End');
// });


var ps = spawn('casperjs', [__dirname + '/download.js', argv.type].concat(argv._));
ps.stdout.on('data', function (data) {
    console.log(data.toString().replace("\n", ""));
});
ps.stderr.on('data', function (data) {
    console.log(data.toString().replace("\n", ""));
});
ps.on('exit', function () {
    console.log('End');
});