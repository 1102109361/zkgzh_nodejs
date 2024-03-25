// 新大陆防疫调整平台接口对接 newland
// 接口文档地址：https://note.youdao.com/s/QIYeUMtv
'use strict';
var crypto = require("crypto");
var request = require("request");
var md5 = require('blueimp-md5');
var _ = require('lodash');

var device_db = require('./device_db');
var qiniuFile = require('./qiniuFile');


var targetOId = 17165398;//机构ID
var aesKey = "y9A6UwPFpmM0RVIbmFRvDqcyHmtbsumi";//aes加密key
var testHost = "http://121.36.44.196:5360";//测试域名
var host = "";//正式域名

//3、新增人员
/*
url：/business-service/person
请求方式：POST 入参： name	string	是	姓名
返回：id	string	personId 用做添加授权使用 name	string	姓名
*/
async function addPerson(arr, deviceSn) {
    var retArr = [];
    for (let node of arr) {
        var ret = await requestIt({
            url: `${testHost}/business-service/person?targetOId=${targetOId}`,
            body: {
                "name": node.name
            },
            json: true,
            method: "POST"
        });
        //console.log('请求结果:', ret);

        if (ret.code != 0) {
            console.error("请求出错_addPerson", ret);
            continue;
        }
        var rData = ret.data;
        try {
            rData = JSON.parse(rData);
        } catch (e) {
        }
        var ret = await addNewAuthorize([{
            name: node.name,
            idCard: node.idCard,
            endTime: node.endTime,
            personId: rData.id
        }], deviceSn);
        retArr.push(ret);
    }
    return retArr;
}

//4、新增授权
/*
url：/business-service/sn/{sn}/authorizations
请求方式：POST
入参：数组
personId	String	personId
startTime	long	生效时间(毫秒) 不限制传null
endTime	long	过期时间(毫秒)不限制传null
useLimit	long	使用次数限制不限制传null
authorizationData	string	授权内容
type	string	授权类型 如 FACE, BID, NFC,IDCARD, FINGER,QRCODE;人脸授权请先调用post /files 接口上传图片得到url(请看下面10 上传文件接口)
dayOfWeekLimit	数组[1,7]	1代表星期1,7代表星期日,不限制传空数组
timeRangeLimit	数组[]	不限制可传空数组
payload	string	附带字段 可在里面带一些工号 可以放json
回参：数组
id	string	授权id
startTime	long	生效时间(毫秒)
endTime	long	过期时间(毫秒)
useLimit	long	使用次数限制
authorizationData	string	授权内容
type	string	授权类型
sn	string	设备sn
dayOfWeekLimit	数组[1,7]	1代表星期天,2代表星期一,7代表星期六,不限制传空数组
payload	string	附带字段 可在里面带一些工号 可以放json
*/
async function addNewAuthorize(arr, deviceSn) {
    var post_arr = [];
    _.each(arr, (node) => {
        //console.log("授权数据：", JSON.stringify(node));
        post_arr.push({
            "personId": node.personId,
            "startTime": null,
            "endTime": new Date(node.endTime).getTime(),
            "useLimit": null,
            "authorizationData": (node.idCard),
            "type": "IDCARD",
            "dayOfWeekLimit": [],
            "timeRangeLimit": [],
            "payload": JSON.stringify({
                "userInfo": aesCode(`${node.name}/${node.idCard}`),
                "exam": {"num": "015322453200023", "room": "第3考试", "seat": "12"}
            }),
        });
    });
    var ret = await requestIt({
        url: `${testHost}/business-service/sn/${deviceSn}/authorizations?targetOId=${targetOId}`,
        body: post_arr,
        json: true,
        method: "POST"
    });
    console.log("请求授权:", JSON.stringify(post_arr), '\n响应结果：', JSON.stringify(ret));
    if (ret.code != 0) {
        console.error("请求出错_addNewAuthorize", ret);
        return;
    }
    var rData = ret.data;
    try {
        rData = JSON.parse(rData);
    } catch (e) {
    }
    //console.log("rData", rData);
    return rData;
}

//清空单个设备的授权
async function clearAuthorize(deviceSN) {
    var ret = await requestIt({
        url: `${testHost}/business-service/sn/${deviceSN}/authorizations?targetOId=${targetOId}`,
        method: "DELETE"
    });
    try {
        ret = JSON.parse(ret);
    } catch (e) {
    }
    if (ret.code != 0) {
        console.error("请求出错_clearAuthorize", ret);
        return;
    }
    console.log("清空设备授权成功", ret);
    return ret;
}

//aes加密
function aesCode(str) {
    var cipherChunks = [];
    var cipher = crypto.createCipheriv('aes-256-ecb', aesKey, "");
    cipher.setAutoPadding(true);
    cipherChunks.push(cipher.update(str, 'utf8', 'base64'));
    cipherChunks.push(cipher.final('base64'));
    return cipherChunks.join('');
}

//aes解密
function aesDeCode(str) {
    var decipher = crypto.createDecipheriv('aes-256-ecb', aesKey, "");
    let decrypted = decipher.update(str, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/*
//md5加密
function md5(str) {
    var hash = crypto.createHash("md5");
    hash.update(str, 'utf8');
    return hash.digest("hex");
}
*/

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
    return;
}

module.exports = {
    addNewAuthorize,
    clearAuthorize,
    addPerson,
    savePassLog
};
