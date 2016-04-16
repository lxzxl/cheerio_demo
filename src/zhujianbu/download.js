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
var Set = require('collections/set');
var casper = require('casper').create(
    {
        verbose: true,
        logLevel: 'debug',
        pageSettings: {
            loadImages: false,        // do not load images
            loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
        }
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
loadTmpRows(province);

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
                            this.log('========'+province.name + '====Page====' + curPageSize + '/' + province.maxPageSize, 'info');
                            var rows = htmlParser.parseTR.call(this);
                            for (var i = 0; i < rows.length; i++) {
                                var _obj = _.zipObject(province.header, rows[i]);
                                _obj['地区'] = province.name;
                                if (province.rows.add(_obj) && province.rows.length === province.totalNum) {
                                    this.log('========Reach Max Num========', 'info');
                                    saveData(province);
                                    updateProvincesConfig(province);
                                    this.exit(0);
                                }
                            }
                            if (curPageSize < province.maxPageSize) {
                                this.click('#LinkButton3');
                            }
                        })
                        .then(function final() {
                            saveData(province);
                            updateProvincesConfig(province);
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

function updateProvincesConfig(province) {
    var provincesConf = getProvincesConfig();
    provincesConf[province.name].lastNum = province.rows.length;
    fs.write(configPath, JSON.stringify(provincesConf, null, 2), 'w');
}

function loadTmpRows(province) {
    var tmpFilePath = basePath + 'outputs/' + dataType + '.' + province.name + '.tmp.json';
    province.rows = new Set(
        fs.exists(tmpFilePath) ? JSON.parse(fs.read(tmpFilePath)) : []
        , null
        , function (obj) {// hash method for object.
            return obj['注册证书号'];
        }
    );
}

function saveData(province) {
    var tmpFilePath = basePath + 'outputs/' + dataType + '.' + province.name + '.tmp.json';
    var allFilePath = basePath + 'outputs/' + dataType + '.' + province.name + '.all.json';
    fs.write(tmpFilePath, JSON.stringify(province.rows, null, 2), 'w');
    var msg = province.rows.length + '/' + province.totalNum;
    if (province.rows.length === province.totalNum) {
        fs.write(allFilePath, JSON.stringify(province.rows, null, 2), 'w');
    }
    casper.log('========' + province.name + '========downloaded========' + msg, 'info');
}
