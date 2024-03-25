/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-11 15:55:17
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-11 16:14:16
 * @FilePath: \ksbm\routes\third\qiniuFile.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
//防疫设备需要的数据库交互接口

var qiniu = require('qiniu');
var UUID = require("uuid");
var _ = require('lodash');
var stream = require('stream');

var accessKey = 'AfB_YH06GEOUDxwekRf8sTxHJ8mx4hVLSyfx62DI';
var secretKey = 'lYG4AcAszzM3_3qddrszBDnWgIj7zZMlPfP4lgOF';
var qiniu_mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
var qiniu_config = new qiniu.conf.Config();

var fileOrigin = "http://img.ksbm.fjrst.cn/"; //七牛存储图片域名
var bucket = "ksbm"; //七牛存储图片

function uptoken(bucket, key) {
    var options = {
        scope: bucket,
    };
    var putPolicy = new qiniu.rs.PutPolicy(options);
    var uploadToken = putPolicy.uploadToken(qiniu_mac);
    return uploadToken;
}

function upFileToQiNiu(files, callback) {
    var nowBucket = bucket;
    var nowFileOrigin = fileOrigin;
    var fileObj = {};
    // var time = changeDate(new Date(), 'yyyyMMddhhmmsstt');
    var time = UUID.v1().replace(/-/g, "");
    var formUploader = new qiniu.form_up.FormUploader(qiniu_config);
    var putExtra = new qiniu.form_up.PutExtra();
    var i = 0;
    var maxI = Object.keys(files).length;
    if (!maxI) return callback({});
    _.mapKeys(files, function(obj, key) {
        toUpFile(obj, key);
    });

    function toUpFile(obj, key) {
        var n = obj.fileName.split(".");
        key = (obj.devKind || 'unknowdev/') + time + "." + (n[n.length - 1]);
        var uploadToken = uptoken(nowBucket, key);
        var readableStream = new stream.PassThrough(); // 创建一个bufferstream
        readableStream.end(obj.buffer); //将Buffer写入
        formUploader.putStream(uploadToken, key, readableStream, putExtra, function(respErr, respBody, respInfo) {
            i++;
            try {
                respBody = JSON.parse(respBody);
            } catch (err) { }
            if (respErr) {
                console.error("upFileToQiNiu1", respErr);
            } else if (respInfo.statusCode == 200) {
                var fileUrl = nowFileOrigin + respBody.key;
                fileObj[obj.rid] = fileUrl;
            } else {
                if (respBody.code == 614 || respBody.error == "file exists") {
                    //资源已存在
                    var fileUrl = nowFileOrigin + key;
                    fileObj[obj.rid] = fileUrl;
                }
                console.error("upFileToQiNiu", respBody, obj.fileName);
            }
            if (i == maxI) {
                callback && callback(fileObj);
            }
        });
    }
}

module.exports = {
    upFileToQiNiu
}
