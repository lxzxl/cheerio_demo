/**
 * Created by steven on 16/7/11.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const csv = require('fast-csv');
const URI = require("urijs");
const cheerio = require('cheerio');
const Crawler = require("simplecrawler");

const Utils = require('../Utils');


// const allowMajors = ['二级注册建筑师', '二级注册结构工程师', '注册化工工程师', '监理工程师', '造价工程师'];
const allowMajors = ['二级注册建筑师',];

// save to csv file.
const csvFilePath = __dirname + '/output.csv';
const csvStream = csv.createWriteStream({headers: true});
const writableStream = fs.createWriteStream(csvFilePath, {flags: 'a+',});

csvStream.pipe(writableStream);

// error log.
const tmpErrFilePath = __dirname + '/error.tmp';
const errFilePath = __dirname + '/error.csv';
const errStream = fs.createWriteStream(tmpErrFilePath, {flags: 'w'});


function save(data) {
    csvStream.write(data);
    // console.log(file + ' -- ' + rows.length + ' -- Loaded!');
};

// start page.
const seedHost = '210.12.219.18';
const seedPath = '/jianguanfabuweb/certifiedEngineers.html';
const allowMajorsMapping = {};

// list page.
const jsonPath = '/jianguanfabuweb/handler/GetCompanyData.ashx';
const jsonParam = '?method=GetEngineersData&name=&card=&stampnum=&company=&major=2&PageIndex=1&PageSize=';
const defaultJsonPathURI = new URI(jsonPath + jsonParam);
defaultJsonPathURI.setQuery({
    PageSize: 200
});

//detail page.
const detailPath = '/jianguanfabuweb/certifiedEngineers_details.aspx';
const detailLinkRegex = /href="((?:certifiedEngineers_details\.aspx).*?)"/g;
const referrer = 'http://' + seedHost + seedPath;

module.exports.create = function (opt = {}) {
    const crawler = new Crawler(seedHost);
    const isIncremental = opt.isIncremental || false;
    crawler.initialPath = seedPath;
    crawler.interval = 500;
    crawler.maxConcurrency = 2;
    crawler.maxDepth = 0;
    crawler.urlEncoding = 'utf-8';


    var onlyHtml = crawler.addFetchCondition(function (parsedURL) {
        return parsedURL.uriPath.match(/\/(GetCompanyData\.ashx|certifiedEngineers_details\.aspx)$/);
    });

    crawler.on("crawlstart", function () {
        console.log("Crawl starting");
    });

    crawler.on('fetcherror', function (queueItem, response) {
        console.log('!!!Error: ' + queueItem.url);
        errStream.write(queueItem.url + '\n');
    });
    crawler.on('fetchclienterror', function (queueItem, errorData) {
        console.log('!!!Client Error: ' + queueItem.url + errorData);
        errStream.write(queueItem.url + '\n');
    });

    crawler.on("fetchcomplete", function (queueItem, responseBuffer, response) {
        // let _continue = this.wait();
        let $, curURIQuery, major, majorName;
        let curURI = new URI(queueItem.path);
        switch (curURI.path()) {
            case seedPath:
                $ = cheerio.load(responseBuffer);
                $('#major option').each((i, elem) => {
                    let $elem = $(elem);
                    majorName = $elem.text().trim();
                    major = $elem.val();
                    if (allowMajors.includes(majorName)) {
                        let jsonPathURI = defaultJsonPathURI.clone().setQuery({
                            major,
                        });
                        allowMajorsMapping[major] = {
                            majorName,
                            jsonPathURI
                        };
                        if (isIncremental) {
                            crawler.queueURL(jsonPathURI.resource(), {
                                name: majorName,
                                url: referrer
                            });
                        }
                    }
                });
                break;
            case jsonPath:
                let data = JSON.parse(responseBuffer);
                let matches = Utils.getMatches(data.tb, detailLinkRegex, 1);
                console.log(queueItem.url);
                console.log('Matches: ' + matches.length);
                matches.forEach(detailLink=> {
                    let detailLinkURI = new URI(detailLink).absoluteTo(seedPath);
                    // add detail link to queue.
                    crawler.queueURL(detailLinkURI.resource(), {
                        url: referrer,
                        depth: 1
                    });
                });
                // if pageCount less than all page, add more jsonPath link to queue.
                curURIQuery = curURI.query(true);
                major = curURIQuery.major;
                let curPageIndex = parseInt(curURIQuery.PageIndex) || 1;
                if (curPageIndex < data.PageCount) {
                    let jsonPathURI = allowMajorsMapping[major].jsonPathURI;
                    let majorName = allowMajorsMapping[major].majorName;
                    jsonPathURI.setQuery({
                        PageIndex: curPageIndex + 1
                    });
                    crawler.queueURL(jsonPathURI.resource(), {
                        name: majorName,
                        url: referrer
                    });
                }
                break;
            case detailPath:
                curURIQuery = curURI.query(true);
                major = curURIQuery.major;
                majorName = allowMajorsMapping[major].majorName;
                $ = cheerio.load(responseBuffer);
                let name = $('.engineer_basic_infor_table_name').text().trim();
                $('.zhengshu').each((i, elem)=> {
                    let $elem = $(elem);
                    let title = $elem.find('.zhengshu_head').text().trim();
                    if (title === majorName) {
                        let company = $elem.find('.zhengshu_table_company_name').text().trim();
                        save({
                            majorName,
                            name,
                            company
                        });
                        return false;
                    }
                });
                break;
        }

        // _continue();
    });

    crawler.on("complete", function () {
        csvStream.end();
        console.log('Csv file generated!');
        fs.rename(tmpErrFilePath, errFilePath);
    });

    return {
        start: crawler.start,
        addUrl: function (url) {
            let curURI = new URI(url);
            let curURIQuery = curURI.query(true);
            let major = curURIQuery.major;
            let curPageIndex = parseInt(curURIQuery.PageIndex) || 1;
            // TODO: allowMajorsMapping should be fixed by downloaded once.
            let jsonPathURI = allowMajorsMapping[major].jsonPathURI;
            let majorName = allowMajorsMapping[major].majorName;
            jsonPathURI.setQuery({
                PageIndex: curPageIndex + 1
            });
            crawler.queueURL(jsonPathURI.resource(), {
                name: majorName,
                url: referrer
            });
        }
    };
};