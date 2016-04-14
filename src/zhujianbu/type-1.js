/**
 * Created by steven on 16/4/14.
 */
'use strict';

var casper = require('casper').create(
    {
        verbose: true,
        logLevel: 'debug'
    }
);
var common = require('./common');

casper.start('http://219.142.101.79/regist/wfRegister.aspx?type=1');

casper.then(function () {
    this.click('input[type=submit][name=Button1]');
});
casper.then(function () {
    this.log(common.getMaxPageSize(this.fetchText('#labPageInfo')), 'info');
});
casper.then(function () {
    this.click('#LinkButton3');
});
casper.then(function () {
    this.log(this.fetchText('#labPageInfo'), 'info');
});
casper.then(function () {
    this.log('Done', 'info');
    this.exit();
});

casper.run();

