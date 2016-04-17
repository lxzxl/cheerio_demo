/**
 * Created by steven on 16/4/16.
 */
'use strict';

const fs = require('fs');
const csv = require('fast-csv');
const parseArgs = require('minimist');
const outputPath = __dirname + '/outputs/';

const argv = parseArgs((process.argv.slice(2)));
const dataType = argv._[0];

const csvFilePath = __dirname + '/csvOutputs/' + dataType + '.csv';
const jsonFileRegex = new RegExp(`^${dataType}.([\u4E00-\u9FA5]+).all.json$`);

const csvStream = csv.createWriteStream({headers: true});
const writableStream = fs.createWriteStream(csvFilePath);
writableStream.on('finish', function () {
    console.log('Converted!');
});
csvStream.pipe(writableStream);

fs.readdir(outputPath, function (err, files) {
    files.forEach(function (file) {
        if (jsonFileRegex.test(file)) {
            let rows = JSON.parse((fs.readFileSync(outputPath + file)));
            rows.forEach(function (row) {
                csvStream.write(row);
            });
            console.log(file + ' -- ' + rows.length + ' -- Loaded!');
        }
    });
    csvStream.end();
    console.log('Csv file generated!');
});