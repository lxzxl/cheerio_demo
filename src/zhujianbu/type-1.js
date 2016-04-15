/**
 * Created by steven on 16/4/14.
 */
'use strict';

var fs = require('fs');
var csv = require('to-csv');
var casper = require('casper').create(
    {
        verbose: true,
        logLevel: 'debug'
    }
);
var htmlParser = require('./htmlParser');

var provinceName = '青海';
var maxPageSize = 0;

casper
    .start('http://219.142.101.79/regist/wfRegister.aspx?type=1')
    .then(function setProvince() {
        var provinceValue = this.evaluate(function (name) {
            var options = __utils__.findAll('select#ddlManageDep option');
            for (var i = 0; i < options.length; i++) {
                if (options[i].innerText === name) {
                    document.querySelector('select#ddlManageDep').value = options[i].value;
                    return options[i].value
                }
            }
        }, provinceName);
        if (!provinceValue) {
            this.log(value + ' Not Found!', 'error');
            casper.exit(0)
        }
    })
    .thenClick('input[type=submit][name=Button1]', function search() {// click search button
        maxPageSize = htmlParser.parseMaxPageSize.call(this);
        var header = htmlParser.parseTH.call(this);
        output([header], 'w');
        this.log(JSON.stringify(header), 'debug');
        var curPageSize = htmlParser.parseCurPageSize.call(this);
        this.log('Page: ' + curPageSize + '/' + maxPageSize, 'info');
    })
    .then(function () {
            this
                .repeat(maxPageSize, function next() {// click next page button.
                    var curPageSize = htmlParser.parseCurPageSize.call(this);
                    this.log('Page: ' + curPageSize + '/' + maxPageSize, 'info');
                    var rows = htmlParser.parseTR.call(this);
                    this.log(JSON.stringify(rows), 'debug');
                    output(rows);
                    this.click('#LinkButton3');
                })
                .then(function done() {
                    this.log('DONE', 'info');
                })
        }
    )
;

casper.run();

function output(lineArr, mode) {
    if (casper.options.logLevel === 'debug') return;
    mode = mode || 'a';
    fs.write('/home/steven/MyProjects/Github/Crawlers/src/zhujianbu/outputs/all.txt', csv(lineArr, {headers: false}), mode);
}