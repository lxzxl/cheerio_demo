/**
 * Created by steven on 16/4/14.
 */



module.exports.getCurPageSize = function (labPageInfo) {
    var matches = labPageInfo.match(/第(\d+)页/);
    return matches && matches[1];
};

module.exports.getMaxPageSize = function (labPageInfo) {
    var matches = labPageInfo.match(/共(\d+)页/);
    return matches && matches[1];
};