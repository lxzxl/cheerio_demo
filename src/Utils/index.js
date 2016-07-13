/**
 * Created by steven on 16/7/13.
 */
'use strict';

module.exports.getMatches = function (string, regex, index) {
    index || (index = 1); // default to the first capturing group
    var matches = [];
    var match;
    while (match = regex.exec(string)) {
        matches.push(match[index]);
    }
    return matches;
};