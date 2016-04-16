/**
 * Created by steven on 16/4/14.
 */
'use strict';

var fs = require('fs');
var currentFile = require('system').args[3];
var dataType = require('system').args[4];
var provinceName = require('system').args[5];
var curFilePath = fs.absolute(currentFile).split('/');

// I only bother to change the directory if we weren't already there when invoking casperjs
if (curFilePath.length > 1) {
    curFilePath.pop(); // PhantomJS does not have an equivalent path.baseName()-like method
    curFilePath = curFilePath.join('/');
    fs.changeWorkingDirectory(curFilePath);
}

var _ = require('lodash');
var casper = require('casper').create(
    {
        verbose: true,
        logLevel: 'info'
    }
);

var htmlParser = require('../common/htmlParser');

var basePath = curFilePath + '/';
var configPath = basePath + 'config/' + dataType + '.' + 'provinces.json';
var seedLink = 'http://219.142.101.79/regist/wfRegister.aspx?type=' + dataType;

var provincesConf = getProvincesConfig();

if (!provincesConf[provinceName]) process.exit(0);

var province = provincesConf[provinceName];
province.name = provinceName;
province.rows = [];
casper.log(JSON.stringify(province), 'debug');

function generateSuite() {
    return function () {
        casper.log('========Start:' + province.name, 'info');
        casper
            .start(seedLink, function setProvince() {// set province value in dropdown list.
                this.evaluate(function (v) {
                    document.querySelector('select#ddlManageDep').value = v;
                }, province.value);
                this.click('input[type=submit][name=Button1]');
            })
            .then(function () {
                    province.header = htmlParser.parseTH.call(this);
                    this.log(JSON.stringify(province.header), 'debug');
                    this.repeat(province.maxPageSize, function next() {// click next page button.
                            var curPageSize = htmlParser.parseCurPageSize.call(this);
                            this.log('Page: ' + curPageSize + '/' + province.maxPageSize, 'info');
                            var rows = htmlParser.parseTR.call(this);
                            for (var i = 0; i < rows.length; i++) {
                                var _obj = _.zipObject(province.header, rows[i]);
                                _obj['地区'] = province.name;
                                this.log(JSON.stringify(_obj), 'debug');
                                province.rows.push(_obj);
                            }
                            if (curPageSize < province.maxPageSize) {
                                this.click('#LinkButton3');
                            }
                        })
                        .then(function done() {
                            var msg = output(province);
                            this.log(province.name + ' : ' + msg, 'info');
                            updateProvincesConfig();
                        })
                }
            );
    }
}
var check = function () {
    if (province.lastNum !== undefined && province.lastNum === province.totalNum) {
        casper.log('Fully downloaded!', 'info');
        casper.exit(0);
    } else {
        var _suite = generateSuite();
        _suite.call(casper);
        casper.run(check);
    }
};
check();


function getProvincesConfig() {
    return JSON.parse(fs.read(configPath));
}

function updateProvincesConfig() {
    var provincesConf = getProvincesConfig();
    provincesConf[province.name].lastNum = province.lastNum;
    fs.write(configPath, JSON.stringify(provincesConf, null, 2), 'w');

}

function output(province) {
    // if (casper.options.logLevel === 'debug') return;
    var tmpFilePath = basePath + 'outputs/' + dataType + '.' + province.name + '.tmp.json';
    var allFilePath = basePath + 'outputs/' + dataType + '.' + province.name + '.all.json';
    var finalRows = _.uniqBy(province.rows, '注册证书号');
    if (finalRows.length !== province.totalNum && fs.exists(tmpFilePath)) {// merge last result rows.
        var lastRows = JSON.parse(fs.read(tmpFilePath));
        finalRows = _.unionBy(finalRows, lastRows, '注册证书号');
    }
    fs.write(tmpFilePath, JSON.stringify(finalRows, null, 2), 'w');
    var msg = finalRows.length + '/' + province.totalNum;
    if (finalRows.length === province.totalNum) {
        fs.write(allFilePath, JSON.stringify(finalRows, null, 2), 'w');
    }
    province.lastNum = finalRows.length;
    return msg;
}
