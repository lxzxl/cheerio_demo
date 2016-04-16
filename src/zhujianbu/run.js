/**
 * Created by steven on 16/4/16.
 */

var spawn = require('child_process').spawn;
var ps = spawn('casperjs', [__dirname + '/type-1/province.js', 'bj']);
ps.stdout.on('data', function (data) {
    console.log(data.toString().replace("\n", ""));
});
ps.stderr.on('data', function (data) {
    console.log(data.toString().replace("\n", ""));
});
ps.on('exit', function () {
    console.log('End');
});