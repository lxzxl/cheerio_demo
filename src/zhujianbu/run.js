/**
 * Created by steven on 16/4/16.
 */

const fs = require('fs');
const assert = require('assert');
const parseArgs = require('minimist');
const _ = require('lodash');
const async = require('async');

const argv = parseArgs((process.argv.slice(2)));
var dataType = argv._[0];
assert.ok(dataType === 1 || dataType === 2, 'Argv Error: Invalid data type.<1|2>')

const spawn = require('child_process').spawn;


var tasks = {
    config: function () {
        var filePath = _checkExecFile('updateProvincesConf.js');
        var args = [filePath, dataType];
        if (argv._[1])args.push(argv._[1]);
        spawnPs.apply(null, args);
    },
    download: function () {
        var filePath = _checkExecFile('download.js');
        var provinceNames = getProvinces(argv._[1]);
        console.log('Provinces will be downloaded: ' + JSON.stringify(provinceNames));
        async.mapLimit(provinceNames, 4, function (pname) {
            if (pname) spawnPs(filePath, dataType, pname);
        }, function (err, results) {
            console.log('Task done!');
        })
    }
};

var task = tasks[argv.task];
if (task) task();

function getProvinces(name) {
    var configPath = __dirname + '/config/' + dataType + '.' + 'provinces.json';
    var provincesObj = JSON.parse(fs.readFileSync(configPath));
    var pNames = [];
    _.chain(provincesObj).toPairs().sortBy(item => item[1].totalNum)
        .each(
            function(pair) {
                var k = pair[0];
                var obj = pair[1];
                if (obj.totalNum > 0) {
                    if (obj.lastNum !== obj.totalNum) {
                        pNames.push(k)
                    } else {
                        if (k === name) console.log(k + ' is already fully downloaded!');
                    }
                } else {
                    if (k === name) console.log(k + ' has 0 results!');
                }
            }
        ).value();
    return name ? _.filter(pNames, pname => pname === name) : pNames;
}

function _checkExecFile(filename) {
    var filePath = __dirname + '/' + filename;
    if (!fs.existsSync(filePath)) {
        console.log('Error: task file doesn\'t exists! - ' + filePath);
        process.exit(1);
    }
    return filePath;
}

function spawnPs() {
    var ps = spawn('casperjs', Array.from(arguments));
    ps.stdout.on('data', function (data) {
        console.log(data.toString().replace("\n", ""));
    });
    ps.stderr.on('data', function (data) {
        console.log(data.toString().replace("\n", ""));
    });
    ps.on('exit', function () {
        console.log('End');
    });
}
