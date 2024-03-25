// 测温云平台接口对接 newland
'use strict';
var crypto = require("crypto");
var request = require("request");
var md5 = require('blueimp-md5');
var _ = require('lodash');

var redisCache = require('../../leancache/cache');
var device_db = require('./device_db');
var qiniuFile = require('./qiniuFile');


var account = "fgk0513458";
var password = "zzhy2022";

var host = "https://cewen.hikyun.com";//正式域名

//日期格式转换
function changeDate(time, dateType) {
    if (!time) return "";
    if (!dateType) {
        dateType = "yyyy-MM-dd"
    }
    time = new Date(time);
    var y = time.getFullYear();
    var M = time.getMonth() + 1;
    var d = time.getDate();
    var h = time.getHours();
    var m = time.getMinutes();
    var s = time.getSeconds();
    var t = time.getMilliseconds();
    if (y == "NaN") {
        return null;
    }
    M = M < 10 ? ("0" + M) : M;
    d = d < 10 ? ("0" + d) : d;
    h = h < 10 ? ("0" + h) : h;
    m = m < 10 ? ("0" + m) : m;
    s = s < 10 ? ("0" + s) : s;
    dateType = dateType.replace("yyyy", y);
    dateType = dateType.replace("MM", M);
    dateType = dateType.replace("dd", d);
    dateType = dateType.replace("hh", h);
    dateType = dateType.replace("mm", m);
    dateType = dateType.replace("ss", s);
    dateType = dateType.replace("tt", t);
    return dateType;
}

//获取用户sessionId
async function getUserSession() {
    var obj = {
        name: "hikyunSessionId"
    };
    var sessionId = await redisCache.getDataOnly(obj);
    if (sessionId) {
        try {
            sessionId = JSON.parse(sessionId);
        } catch (e) { }
        return sessionId;
    }
    var ret = await requestIt({
        url: `${host}/api/v1/userApi/login`,
        body: {
            "account": account,
            "password": password
        },
        json: true,
        method: "POST"
    });
    sessionId = ret.data.sessionId;
    redisCache.saveDataTime(obj, sessionId, 1700);
    return sessionId;
}

//新增人员
async function addPerson(arr, deviceSn) {
    var retArr = [];
    for (let node of arr) {
        var sessionId = await getUserSession();
        var ret = await requestIt({
            url: `${host}/api/v1/accessControlApi/operatePerson`,
            body: {
                "sessionId": sessionId,
                "employeeNo": node.id,
                "personName": node.name,
                "cardNo": node.idCard,
                "deviceSerials": deviceSn,
                "deviceEndTime": changeDate(node.endTime, "yyyy-MM-ddThh:mm:ss"),
                "type": "add"
            },
            json: true,
            method: "POST"
        });
        if (ret.code != 0) {
            console.error("请求出错_addPerson", ret);
            continue;
        }
    }
    return retArr;
}
//通过方案新增人员
async function addPersonProject(params) {
    var prjId = params.prjId;
    var devNos = params.devNos;
    devNos = devNos.split(",");
    var arr = device_db.getScoreListPrjId(prjId);
    await addPerson(arr, devNos);
    return;
}

//清空单个设备的授权
async function clearAuthorize(deviceSN) {
    /*  var arr = device_db.getDevUsers(deviceSN);
     for (let node of arr) {
         var sessionId = await getUserSession();
         var ret = await requestIt({
             url: `${host}/api/v1/accessControlApi/operatePerson`,
             body: {
                "sessionId": sessionId,
                "employeeNo": node.id,
                "personName": node.name,
                "cardNo": node.idCard,
                "deviceSerials": deviceSn,
                "deviceEndTime": new Date(node.endTime).toISOString(),
                "type": "delete"
             },
             json: true,
             method: "POST"
         });
         if (ret.code != 0) {
             console.error("请求出错_addPerson", ret);
             continue;
         }
     }
     return ret; */
    return;
}

//外部请求
async function requestIt(params) {
    return new Promise((resolve, reject) => {
        request(params, function(error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else {
                reject(response);
            }
        });
    });
}

//存储通行日志
async function savePassLog(params) {
    var id = params.id + "";
    device_db.checkOldDev(params.deviceSerial, params.deviceName, 3);
    var oldLog = await device_db.getPassLog(id, params.deviceSerial);
    if (oldLog) return;//已有对应的日志
    var videoUrl = params.videoUrl;//图片信息
    // qiniuFile.upFileToQiNiu({
    //     "passFace": {
    //         rid: "passFace",
    //         fileName: `passFace.jpg`,
    //         buffer: Buffer.from(videoUrl, "base64")
    //     }
    // }, async (fileObj) => {
    //     var fileUrl = fileObj["passFace"];
    var saveObj = {
        log_msgid: id,
        log_name: params.name,
        log_dev_sn: params.deviceSerial,
        log_id_card: params.identityId,
        log_pass_time: changeDate(params.alarmTime, "yyyy-MM-dd hh:mm:ss"),
        log_temperature: +parseInt(params.temperature) || 0,
        log_health_code: params.healthMsg,
        log_img: videoUrl,
        log_detail: JSON.stringify(params)
    };
    await device_db.addPassLog(saveObj);
    // });
    return;
}

module.exports = {
    clearAuthorize,
    addPerson,
    addPersonProject,
    savePassLog
};
