/**
 * Created by steven on 4/15/16.
 */
/*
 Usually these methods are running in browser side.
 */

module.exports.parseCurPageSize = function () {
    var matches = this.fetchText('#labPageInfo').match(/第(\d+)页/);
    return matches ? parseInt(matches[1]) : null;
};

module.exports.parseMaxPageSize = function () {
    var matches = this.fetchText('#labPageInfo').match(/共(\d+)页/);
    return matches ? parseInt(matches[1]) : null;
};

module.exports.parseTH = function () {
    return this.evaluate(function () {
        return __utils__.findAll('#dgEnterpriseList tr:first-child td:not(:first-child)').map(function (td) {
            return td.innerText;
        })
    });
};

module.exports.parseTR = function () {
    return this.evaluate(function () {
        var trs = __utils__.findAll('#dgEnterpriseList tr:not(:first-child)');
        return trs.map(function (tr) {
            return Array.prototype.slice.call(tr.querySelectorAll('td:not(:first-child)')).map(function (td) {
                return td.innerText;
            })
        });
    });
};