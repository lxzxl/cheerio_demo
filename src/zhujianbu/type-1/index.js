/**
 * Created by steven on 16/4/14.
 */
'use strict';

var fs = require('fs');
var currentFile = require('system').args[3];
var provinceName = require('system').args[4];
var curFilePath = fs.absolute(currentFile).split('/');

// I only bother to change the directory if we weren't already there when invoking casperjs
if (curFilePath.length > 1) {
    curFilePath.pop(); // PhantomJS does not have an equivalent path.baseName()-like method
    curFilePath = curFilePath.join('/');
    fs.changeWorkingDirectory(curFilePath);
}

var _ = require('lodash');
var csv = require('to-csv');
var casper = require('casper').create(
    {
        verbose: true,
        logLevel: 'info'
    }
);

var htmlParser = require('../common/htmlParser');

var basePath = curFilePath + '/';

var config = {
    fullDownload: true
};
var provinces = {};

casper
    .start('http://219.142.101.79/regist/wfRegister.aspx?type=1')
    .then(function () {// craw each province data.
        this.each(provinces, function crawlProvince(self, province) {
            self.log('=====================' + province.name, 'debug');
            this
                .then(function setProvince() {// set province in dropdown list.
                    this.evaluate(function (province) {
                        document.querySelector('select#ddlManageDep').value = province.value;
                    }, province);
                })
                .thenClick('input[type=submit][name=Button1]', function submit() {// click search button
                    province.maxPageSize = htmlParser.parseMaxPageSize.call(this);
                    province.totalNum = htmlParser.parseTotalNum.call(this);
                    var header = htmlParser.parseTH.call(this);
                    province.header = header;
                    this.log(JSON.stringify(header), 'debug');
                    var curPageSize = htmlParser.parseCurPageSize.call(this);
                    this.log('Page: ' + curPageSize + '/' + province.maxPageSize, 'info');
                })
                .then(function () {
                        this.repeat(province.maxPageSize, function next() {// click next page button.
                                var curPageSize = htmlParser.parseCurPageSize.call(this);
                                this.log('Page: ' + curPageSize + '/' + province.maxPageSize, 'info');
                                var rows = htmlParser.parseTR.call(this);
                                for (var i = 0; i < rows.length; i++) {
                                    var _obj = _.zipObject(province.header, rows[i]);
                                    _obj['地区'] = province.name;
                                    province.rows.push(_obj);
                                    this.log(JSON.stringify(_obj), 'debug');
                                }
                                this.click('#LinkButton3');
                            })
                            .then(function done() {
                                var msg = output(province);
                                updateProvincesConfig();
                                this.log(province.name + ' : ' + msg, 'info');
                                this.exit(0);
                            })
                    }
                );
        })
    })
;

casper.run();

function getProvincesConfig() {
    return JSON.parse(fs.read(basePath + 'provinces.json'));
}

function getUpdateProvince(allProvinces) {
    if (config.fullDownload) return allProvinces;
    var provincesConf = getProvincesConfig();
    return _.filter(allProvinces, function (p) {
        return provincesConf[p.name].totalNum !== p.totalNum;
    })
}

function updateProvincesConfig() {
    var provincesConf = getProvincesConfig();
    _.each(provinces, function (p) {
        provincesConf[p.name] = _.pick(p, ['name', 'value', 'maxPageSize', 'totalNum', 'done']);
    });

    fs.write(basePath + 'provinces.json'
        , JSON.stringify(provincesConf, null, 2)
        , 'w');

}

function output(province) {
    // if (casper.options.logLevel === 'debug') return;
    var tmpFilePath = basePath + 'outputs/' + province.name + '.tmp.json';
    var allFilePath = basePath + 'outputs/' + province.name + '.all.json';
    var finalRows = _.uniqBy(province.rows, '注册证书号');
    if (finalRows.length !== province.totalNum && fs.exists(tmpFilePath)) {// merge last result rows.
        var lastRows = JSON.parse(fs.read(tmpFilePath));
        finalRows = _.unionBy(finalRows, lastRows, '注册证书号');
    }
    fs.write(tmpFilePath, JSON.stringify(finalRows, null, 2), 'w');
    var msg = finalRows.length + '/' + province.totalNum;
    if (finalRows.length === province.totalNum) {
        fs.write(allFilePath, JSON.stringify(finalRows, null, 2), 'w');
        province.done = true;
    }
    return msg;
}