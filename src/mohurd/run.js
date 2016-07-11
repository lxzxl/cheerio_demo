/**
 * Created by steven on 16/7/11.
 */
'use strict';

const cheerio = require('cheerio');
const Crawler = require("simplecrawler");

const seedHost = 'http://210.12.219.18';
const seedPath = '/jianguanfabuweb/certifiedEngineers.html';
const allowMajors = ['二级注册建筑师', '二级注册结构工程师', '注册化工工程师', '监理工程师', '造价工程师'];
const jsonPath = '/jianguanfabuweb/handler/GetCompanyData.ashx';
const jsonParam = '?method=GetEngineersData&name=&card=&stampnum=&company=&major=2&PageIndex=1&PageSize=';

const crawler = Crawler.crawl(seedHost);

crawler.initialPath = seedPath;
crawler.interval = 500;
crawler.maxConcurrency = 4;
crawler.maxDepth = 0;
crawler.urlEncoding = 'utf-8';

let refer = '';
crawler.on("fetchstart", function (queueItem, responseBuffer) {
    switch (queueItem.path) {
        case seedPath:
            refer = queueItem.url;
            break;
        case jsonPath:
            this.customHeaders.Referer = refer;
            break;
    }
});
crawler.on("fetchcomplete", function (queueItem, responseBuffer, response) {
    // let _continue = this.wait();
    let $ = cheerio.load(responseBuffer);
    Array.from($('#major option')).forEach(option => {
        let $option = $(option);
        let name = $option.text();
        if (allowMajors.includes(name)) {
            //FIX: wrong way to use queueURL.
            crawler.queueURL(jsonPath, {
                url: seedHost + jsonPath + jsonParam
            });
        }
    });
    // _continue();
});

crawler.start();