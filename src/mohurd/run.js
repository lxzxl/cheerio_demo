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

// start page.
const seedHost = 'http://210.12.219.18';
const seedPath = '/jianguanfabuweb/certifiedEngineers.html';
// const allowMajors = ['二级注册建筑师', '二级注册结构工程师', '注册化工工程师', '监理工程师', '造价工程师'];
const allowMajors = ['二级注册建筑师',];
const allowMajorsMapping = {};

// list page.
const jsonPath = '/jianguanfabuweb/handler/GetCompanyData.ashx';
const jsonParam = '?method=GetEngineersData&name=&card=&stampnum=&company=&major=2&PageIndex=1&PageSize=';
const defaultJsonPathURI = new URI(jsonPath + jsonParam);
defaultJsonPathURI.setQuery({
    PageSize: 5
});

//detail page.
const detailPath = '/jianguanfabuweb/certifiedEngineers_details.aspx';
const detailLinkRegex = /href="((?:certifiedEngineers_details\.aspx).*?)"/g;


const crawler = Crawler.crawl(seedHost);

crawler.initialPath = seedPath;
crawler.interval = 500;
crawler.maxConcurrency = 4;
crawler.maxDepth = 0;
crawler.urlEncoding = 'utf-8';

const referrer = seedHost + seedPath;

var onlyHtml = crawler.addFetchCondition(function (parsedURL) {
    return parsedURL.uriPath.match(/(GetCompanyData\.ashx|certifiedEngineers_details\.aspx)$/);
});

crawler.on("crawlstart", function () {
    console.log("Crawl starting");
});

crawler.on("queueadd", function (queueItem, parsedURL) {
    switch (parsedURL.uriPath) {
        case jsonPath:
            queueItem.name = 'test-name';
            break;
    }
});
crawler.on("fetchcomplete", function (queueItem, responseBuffer, response) {
    // let _continue = this.wait();
    let $;
    let curURI = new URI(queueItem.path);
    switch (curURI.path()) {
        case seedPath:
            $ = cheerio.load(responseBuffer);
            Array.from($('#major option')).forEach(option => {
                let $option = $(option);
                let name = $option.text();
                let major = $option.val();
                if (allowMajors.includes(name)) {
                    let jsonPathURI = defaultJsonPathURI.clone().setQuery({
                        major,
                    });
                    allowMajorsMapping[major] = {
                        name,
                        jsonPathURI
                    };
                    crawler.queueURL(jsonPathURI.resource(), {
                        name: name,
                        url: referrer
                    });
                }
            });
            break;
        case jsonPath:
            // let hrefReg = new RegExp('href=\"certifiedEngineers_details\.aspx\?personid=.*?&major=2\"');
            let data = JSON.parse(responseBuffer);
            let m;
            while ((m = detailLinkRegex.exec(data.tb)) !== null) {
                if (m.index === detailLinkRegex.lastIndex) {
                    detailLinkRegex.lastIndex++;
                }
                // add detail link to queue.
                let detailLink = m[1];
                let detailLinkURI = new URI(detailLink).absoluteTo(seedPath);
                console.log(detailLinkURI.resource());
                crawler.queueURL(detailLinkURI.resource(), {
                    url: referrer,
                    depth: 1
                });
            }
            // // if pageCount less than all page, add more jsonPath link to queue.
            // let curURIQuery = curURI.query(true);
            // let major = curURIQuery.major;
            // let curPageIndex = parseInt(curURIQuery.PageIndex) || 1;
            // if (curPageIndex < data.PageCount) {
            //     let jsonPathURI = allowMajorsMapping[major].jsonPathURI;
            //     let name = allowMajorsMapping[major].name;
            //     jsonPathURI.setQuery({
            //         PageIndex: curPageIndex + 1
            //     });
            //     console.log(jsonPathURI.resource());
            //     crawler.queueURL(jsonPathURI.resource(), {
            //         name: name,
            //         url: referrer
            //     });
            // }
            break;
        case detailPath:
            $ = cheerio.load(responseBuffer);
            console.log($('.engineer_basic_infor_table_name').text(), '-', $('.zhengshu_table_company_name').text());
            break;
    }


    // _continue();
});

crawler.on("complete", function () {
    console.log("Finished!");
});

crawler.start();