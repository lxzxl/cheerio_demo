/**
 * Created by steven on 16/4/14.
 */
'use strict';

var fs = require('fs');
var currentFile = require('system').args[3];
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
        logLevel: 'debug'
    }
);

var htmlParser = require('../common/htmlParser');

var basePath = curFilePath + '/';

var seedLink = 'http://219.142.101.79/regist/wfRegister.aspx?type=1';

var provinces = {};
var suites = [];

casper
    .start(seedLink)
    .then(function getAllProvince() {// get all province list.
        var allProvinces = this.evaluate(function () {
            return __utils__
                .findAll('select#ddlManageDep option')
                .filter(function (el) {
                    return el.value !== '%' && ( el.value === '63' || el.value === '54');
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
        });
        for (var i = 0; i < allProvinces.length; i++) {
            var p = allProvinces[i];
            var f = generateSuit.call(this, seedLink, p.name, p.value);
            suites.push(f);
        }
    })
;

var currentSuite = 0;
var check = function () {
    if (suites[currentSuite]) {
        suites[currentSuite].call(this);
        currentSuite++;
        casper.run(check);
    } else {
        this.echo("All done.");
        this.exit();
    }
};

casper.run(check);

function getProvincesConfig() {
    return JSON.parse(fs.read(basePath + 'provinces.json'));
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

function generateSuit(link, _name, _value) {
    return function () {
        this.log('========Start:' + _name, 'info');
        this
            .start(link, function setProvince() {// set province value in dropdown list.
                this.evaluate(function (v) {
                    document.querySelector('select#ddlManageDep').value = v;
                    __utils__.echo('[[[' + v + ']]]')
                }, _value);
            })
            .thenClick('input[type=submit][name=Button1]', function submit() {// click search button
                var maxPageSize = htmlParser.parseMaxPageSize.call(this);
                var totalNum = htmlParser.parseTotalNum.call(this);
                this.log('========totalNum: ' + totalNum + ' - Page: ' + maxPageSize, 'info');
            })
    }
}
