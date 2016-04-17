/**
 * Created by steven on 16/4/16.
 */
'use strict';

const fs = require('fs');
const assert = require('assert');
const parseArgs = require('minimist');
const _ = require('lodash');
const async = require('async');

const argv = parseArgs((process.argv.slice(2)));
var dataType = argv._[0];
assert.ok(dataType === 1 || dataType === 2, 'Argv Error: Invalid data type.<1|2>')

const spawn = require('child_process').spawn;

var configPath = __dirname + '/config/';

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
        async.map(provinceNames, function (pname) {
            if (pname) spawnPs(filePath, dataType, pname);
        }, function (err, results) {
            console.log('Task done!');
        });
        // var q = async.queue(function (task) {
        //     if (task) spawnPs(filePath, dataType, task);
        // });
        // q.drain = function () {
        //     console.log('All provinces are downloaded!');
        // };
        // q.push(provinceNames);
    }
};

var task = tasks[argv.task];
if (task) task();

function _getConf(name) {
    let results = [];
    let reg = new RegExp(`^${dataType}.([\u4E00-\u9FA5]+).json$`)
    fs.readdirSync(configPath)
        .forEach(function (filename) {
            let matches = filename.match(reg);
            if (matches) {
                let k = matches[1];// province name.
                let obj = require(configPath + filename);
                if (obj.totalNum > 0) {
                    if (obj.lastNum !== obj.totalNum) {
                        obj.name = k;
                        results.push(obj);
                    } else {
                        if (k === name) console.log(k + ' is already fully downloaded!');
                    }
                } else {
                    if (k === name) console.log(k + ' has 0 results!');
                }
            }
        });
    return results;
}

function getProvinces(name) {
    var confArr = _getConf(name);
    var pNames = _.chain(confArr).sortBy('totalNum').map('name').value();
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
}
