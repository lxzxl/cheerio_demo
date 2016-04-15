/**
 * Created by steven on 16/4/14.
 */
'use strict';

var fs = require('fs');
var _ = require('lodash');
var csv = require('to-csv');
var casper = require('casper').create(
    {
        verbose: true,
        logLevel: 'debug'
    }
);
var htmlParser = require('./htmlParser');

var provinces = [];

casper
    .start('http://219.142.101.79/regist/wfRegister.aspx?type=1')
    .then(function getAllProvince() {// get all province list.
        provinces = this.evaluate(function () {
            return __utils__
                .findAll('select#ddlManageDep option')
                .filter(function (el) {
                    return el.value !== '%' && ( el.value === '63');
                })
                .map(function (el) {
                    return {
                        name: el.innerText,
                        value: el.value,
                        maxPageSize: 0,
                        rows: []
                    };
                });
        });
    })
    .then(function () {// craw each province data.
        this.each(provinces, function crawlProvince(self, province) {
            self
                .then(function setProvince() {// set province in dropdown list.
                    this.evaluate(function (province) {
                        document.querySelector('select#ddlManageDep').value = province.value;
                    }, province);
                })
                .thenClick('input[type=submit][name=Button1]', function submit() {// click search button
                    province.maxPageSize = htmlParser.parseMaxPageSize.call(this);
                    var header = htmlParser.parseTH.call(this);
                    output(province.name, [header], 'w');
                    this.log(JSON.stringify(header), 'debug');
                    var curPageSize = htmlParser.parseCurPageSize.call(this);
                    this.log('Page: ' + curPageSize + '/' + province.maxPageSize, 'info');
                })
                .then(function () {
                        this
                            .repeat(province.maxPageSize, function next() {// click next page button.
                                var curPageSize = htmlParser.parseCurPageSize.call(this);
                                this.log('Page: ' + curPageSize + '/' + province.maxPageSize, 'info');
                                var rows = htmlParser.parseTR.call(this);
                                this.log(JSON.stringify(province.rows), 'debug');
                                for (var i = 0; i < rows.length; i++) {
                                    province.rows.push(r);
                                }
                                this.log(JSON.stringify(province.rows), 'debug');
                                this.click('#LinkButton3');
                            })
                            .then(function done() {
                                this.log(province.name + ' DONE', 'info');
                                this.log(JSON.stringify(province.rows), 'debug');
                                output(province.name, province.rows);
                            })
                    }
                )
        })
    })


;

casper.run();

function output(filename, lineArr, mode) {
    if (casper.options.logLevel === 'debug') return;
    mode = mode || 'a';
    fs.write('/home/steven/MyProjects/Github/Crawlers/src/zhujianbu/outputs/' + filename + '.txt',
        csv(_.uniq(lineArr), {headers: false}), mode);
}