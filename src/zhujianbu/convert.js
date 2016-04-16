/**
 * Created by steven on 16/4/16.
 */

var fs = require('fs');
var csv = require('fast-csv');

var outputPath = __dirname + '/outputs/';

fs.readdir(outputPath, function (err, files) {
    files.forEach(function (file) {
        if (/1\.([\u4E00-\u9FA5]+)\.all.json$/.test(file)) {

        }
    })
});