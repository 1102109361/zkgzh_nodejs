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
    /* var retArr = [];
    for (let node of arr) {
        var sessionId = await getUserSession();
        console.log("sessionId", sessionId);
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
    return retArr; */
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
/*
    dev_sno:"",  //是string设备号
    token:"",  //是stringtoken
    cmp_type:"",  //是int比对类型, 0:其它；1:人证比对； 2:人脸比对
    capture_img:"",  //是string现场抓拍照，需要base64编码
    capture_time:"",  //是string比对时间, 时间戳精确到毫秒。见下例
    capture_score:"",  //是string比对分值
    capture_status:"",  //是int比对结果，0 比对失败， 1 比对通过
    failed_reason:"",  //否string
    person_id:"",  //否int人员id
    person_name:"",  //否string姓名
    person_temperature:"",  //否float体温（摄氏度）
    person_type:"",  //否string人员类型
    id_card:"",  //否string身份证
    ic_card:"",  //否stringIC卡号
    qr:"",  //否string二维码
    card_data:"",  //否object名单中的数据或读取的证件数据，身份证信息等
        card_data.sex:"",  //否int性别 1 男 2 女
        card_data.faceImg :"",  //否string证件照，base64编码
        card_data.identityId:"",  //否string证件号
        card_data.signDepartment:"",  //否string签证机关
        card_data.nation:"",  //否string民族
        card_data.address:"",  //否string地址
    healthCode:"",  //否int0 未开启，1绿码，2黄码，3红码
    rna:"",  //否object核酸检测信息
        rna.ret:"",  //否int核酸检测结果 （0 未知,1   阴性，2 阳性）
        rna.time:"",  //否string核酸检测时间
        rna.src :"",  //否string核酸检测机构
        rna.stopoverCountyName :"",  //否string行程追踪
*/
async function savePassLog(params) {
    if (params.capture_status != 1) return;//比对通过部分才存储记录
    var capture_img = params.capture_img;//图片信息
    var card_data = params.card_data;
    if (card_data) {
        delete card_data.faceImg;
    }
    if (+params.capture_time) {
        params.capture_time = +params.capture_time;
    }
    qiniuFile.upFileToQiNiu({
        "passFace": {
            rid: "passFace",
            devKind: "rv1109/passface/",
            fileName: `passFace.jpg`,
            buffer: Buffer.from(capture_img, "base64")
        }
    }, async (fileObj) => {
        var fileUrl = fileObj["passFace"];
        params.capture_img = fileUrl;
        var saveObj = {
            // log_msgid: id,
            log_name: params.person_name,
            log_dev_sn: params.dev_sno,
            log_id_card: params.id_card,
            log_pass_time: changeDate(params.capture_time, "yyyy-MM-dd hh:mm:ss"),
            log_temperature: +parseInt(params.person_temperature) || 0,
            log_health_code: params.healthCode,
            log_id_info: JSON.stringify(params.card_data),
            log_img: fileUrl,
            log_detail: JSON.stringify(params)
        };
        await device_db.addPassLog(saveObj);
    });
    return;
}

module.exports = {
    clearAuthorize,
    addPerson,
    savePassLog
};
