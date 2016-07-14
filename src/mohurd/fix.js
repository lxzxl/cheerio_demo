/**
 * Created by steven on 16/7/14.
 */
'use strict';

const fs = require('fs');
const readline = require('readline');
const URI = require("urijs");

const spider = require('./spider');


const errFilePath = __dirname + '/error.csv';
const rl = readline.createInterface({
    input: fs.createReadStream(errFilePath),
    output: process.stdout
});

rl.on('line', function (url) {
    let crawler = spider.create({
        isIncremental: true
    });
    crawler.addUrl(url);
    crawler.start();
});
