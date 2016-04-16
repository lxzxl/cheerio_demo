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
        logLevel: 'info',
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

var allProvinces;
var suites = [];
casper
    .start(seedLink)
    .then(function getAllProvince() {// get all province list.
        allProvinces = this.evaluate(function (name) {
            return __utils__
                .findAll('select#ddlManageDep option')
                .filter(function (el) {
                    if (name) {
                        return el.innerText === name
                    } else {
                        return el.value !== '%';
                    }
                })
                .map(function (el) {
                    return {
                        name: el.innerText,
                        value: el.value
                        // maxPageSize: 0,
                        // rows: [],
                        // totalNum: 0
                    };
                });
        }, provinceName);
        suites = allProvinces.map(function (p) {
            return generateSuite.call(this, seedLink, p);
        })
    })
;

var currentSuite = 0;
var check = function () {
    if (suites[currentSuite]) {
        suites[currentSuite].call(this);
        currentSuite++;
        casper.run(check);
    } else {
        updateProvincesConfig();
        this.echo("All done.");
        this.exit();
    }
};

casper.run(check);

function updateProvincesConfig() {
    var provincesConf = fs.exists(configPath) ? JSON.parse(fs.read(configPath)) : {};
    allProvinces.forEach(function (p) {
        provincesConf[p.name] = provincesConf[p.name] || {};
        _.extend(provincesConf[p.name], _.pick(p, ['value', 'maxPageSize', 'totalNum']));
    });
    fs.write(configPath, JSON.stringify(provincesConf, null, 2), 'w');

}

function generateSuite(link, province) {
    return function () {
        this.log('========Start:' + province.name, 'info');
        this
            .start(link, function setProvince() {// set province value in dropdown list.
                this.evaluate(function (v) {
                    document.querySelector('select#ddlManageDep').value = v;
                }, province.value);
            })
            .thenClick('input[type=submit][name=Button1]', function submit() {// click search button
                province.maxPageSize = htmlParser.parseMaxPageSize.call(this);
                province.totalNum = htmlParser.parseTotalNum.call(this);
                this.log('========totalNum: ' + province.totalNum + ' - totalPage: ' + province.maxPageSize, 'info');
            })
    }
}
