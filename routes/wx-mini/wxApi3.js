/*

 */
var router = require('express').Router();
var _ = require('lodash');
var request = require('request');
var urlencode = require('urlencode');

var wx_mini = JSON.parse(process.env.WX_MINI3 || '{}');
var redisCache = require('../../leancache/cache3');

var iconv = require('iconv-lite');
const SM4 = require('../../common/sm4/sm4');
let sm4Config = {
    key: 'ceseNti06sU13No1', //密钥
    mode: 'ecb', //使用ECB模式
    cipherType: 'base64' // default is base64
};
let sm4 = new SM4(sm4Config);

//请求外部的数据--加密
// function encodeData(data) {
//     //数据加密
//     var plaintext = JSON.stringify(data);
//     // var plainbuffer = iconv.encode(plaintext, 'GBK');
//     // var plainStrGbk = plainbuffer.toString();
//     // return sm4.encrypt(plainStrGbk);
//     return sm4.encrypt(plaintext);
// }

function decodeSM4Data(data) {
    //数据解密
    if (!data) {
        return "[]";
    }
    let tr_plaintextRet = sm4.decrypt(data);
    let strDecode = iconv.decode(tr_plaintextRet, 'UTF8');
    strDecode = JSON.parse(strDecode)
    return strDecode;
}

//小程序请求接口中转
router.post("/requestKSBMServet", async (req, res) => {
    var params = req.body;
    var files = req.files;
    // console.log("files", files);
    res.json({
        code: 0,
        msg: "ok"
    });
});


const arrAllowUrl = ["/emp/", '/login', "/dictData.json", "/orCode/", "/score/zfb", "/score/updateCommit", "/phone/sendCode",
    "/student/app/", "/student/manage/", "student/apply/", "/student/home/", "/student/login/", "/student/home/", "/dept/getStuDept", "/studwn", "/wx/"];

//小程序请求接口中转
router.post("/requestKSBMServe", async (req, res) => {
    var params = req.body;
    var files = req.files;
    var authorization = req.headers.authorization || "";
    var requestUrl = params.requestUrl;
    console.error("requestKSBMServe3_调用日志：", JSON.stringify(params));
    if (!requestUrl) {
        console.log("authorization", authorization);
        return;
    }
    var isCheck = false;
    //匹配小程序请求接口列表
    _.each(arrAllowUrl, item => {
        if (requestUrl.indexOf(item) != -1) {
            isCheck = true;
            return false;
        }
    });
    if (!isCheck) {
        console.error("异常请求地址：", isCheck, requestUrl);
        res.json({
            code: -1,
            msg: "请求未授权，请检查请求地址"
        });
        return;
    }
    var requestData = params.requestData;
    var requestType = params.requestType || "POST";
    requestType = requestType.toLocaleUpperCase();
    if (!requestUrl) {
        res.json({
            code: -1,
            msg: "入参缺失"
        });
        return;
    }
    if (requestType == "GET" && requestData) {
        _.mapKeys(requestData, (v, k) => {
            if (typeof (v) == "object") {
                v = urlencode(JSON.stringify(v));
            }
            if (requestUrl.indexOf("?") != -1) {
                requestUrl += `&${k}=${urlencode(v)}`;
            } else {
                requestUrl += `?${k}=${urlencode(v)}`;
            }
        });
    }
    if (files) {
        var file = files.file;
        // var bufferStream = new Readable();
        // bufferStream.push(file.data);
        // bufferStream.push(null);

        // var f = fs.createReadStream(file.name);
        // // console.log("bufferStream", bufferStream);
        // console.log("f", f);

        // var f = fs.createWriteStream(file.name);
        // f.write(file.data,'UTF8');
        // await f.end();
        // requestUrl = 'http://192.168.250.44:5088/ksbm/student/app/home/uploadServlet';
        // requestUrl = 'http://192.168.250.23:3100/wx/requestKSBMServet';
        request.post(requestUrl, {
            formData: {
                // "file": fs.createReadStream(file.name)
            },
            headers: {
                'content-type': 'multipart/form-data',
                'accept-charset': 'utf-8',
                "authorization": authorization
            }
        }, (error, response, body) => {
            let str = body
            // console.log("boy", body);
            if (error || response.statusCode != 200) {
                console.error("requestKSBMServe30_error: requestUrl=", requestUrl, '|error:', error);
                res.json({
                    code: -1,
                    msg: "请求失败，服务出错",
                    data: error
                });
                return;
            }
            if ((typeof body.data) == 'string' && body.msg != 'token') {
                str = decodeSM4Data(body.data)
            }
            res.json(str);
        });
        return;
    }
    request({
        url: requestUrl,
        method: requestType,
        body: requestData,
        json: true,
        headers: {
            'content-type': 'application/json',
            'accept-charset': 'utf-8',
            "authorization": authorization
        }
    }, function (error, response, body) {
        let str = body
        if (error || response.statusCode != 200) {
            console.error("requestKSBMServe31_error: requestUrl=", requestUrl, '|error:', error);
            res.json({
                code: -1,
                msg: "请求失败，服务出错",
                data: error
            });
            return;
        }
        if ((typeof body.data) == 'string' && body.msg != 'token') {
            str = decodeSM4Data(body.data)
            console.log(str, '解密结束2');
        }
        res.json(str);
    });
});

//获取微信小程序档期用户openid等相关信息
router.post("/getOpenId", function (req, res) {
    var params = req.body;
    var code = params.code;
    var appid = params.appid;
    var app = wx_mini[appid];
    var url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + app.appId + "&secret=" + app.secret + "&js_code=" + code + "&grant_type=authorization_code";
    request(url, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            try {
                body = JSON.parse(body);
            } catch (e) {
                // console.error('/getOpenId json 解析错误：', body);
            }
            var openId = body.openid;
            if (!openId) {
                console.error("getOpenId", body);
                res.json({
                    code: -1,
                    msg: "获取openid失败"
                });
                return;
            }
            res.json({ openid: openId });
        } else {
            res.json({
                code: -1,
                msg: "获取失败"
            });
        }
    });
});
//城市服务--实名制检查
router.post("/checkIdentifyInfo", function (req, res) {
    var params = req.body;
    var postData = {
        verify_result: params.verify_result
    };
    res.json({
        identify_ret: 0,
        openid: ""
    });
    return;
    getWxMiniToken(params.appid, function (token) {
        var url = "https://api.weixin.qq.com/cityservice/face/identify/getinfo?access_token=" + token;
        request({
            url: url,
            form: JSON.stringify(postData),
            json: true,
            method: "POST"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                }
                if (body.errcode == 0) {
                    res.json(body);
                } else {
                    console.error("checkIdentifyInfo2", body);
                    res.json({
                        code: -1,
                        msg: "获取失败"
                    });
                }
            } else {
                console.error("checkIdentifyInfo", error);
                res.json({
                    code: -1,
                    msg: "获取失败"
                });
            }
        });
    });
});

//获取微信小程序token
function getWxMiniToken(appid, callBack) {
    var app = wx_mini[appid];
    var theAppid = app.appId;
    var theSecret = app.secret;
    var obj = {
        name: "wxAccessToken",
        appid: theAppid
    };
    redisCache.getDataOnly(obj, function (token) {
        if (!token) { //无缓存信息则调用生成
            console.log("微信小程序获取新token", theAppid);
            getToken();
            return;
        }
        try {
            token = JSON.parse(token);
        } catch (e) {
            redisCache.delData(obj);
        }
        callBack(token);
    });

    function getToken() {
        var url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + theAppid + "&secret=" + theSecret;
        request({
            url: url,
            method: "GET"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var objBody = JSON.parse(body);
                if (objBody.errcode) {
                    console.error('gettoken', url, body, error);
                    callBack && callBack({
                        code: objBody.errcode || -1,
                        msg: objBody.errmsg || "获取失败！"
                    });
                    return;
                }
                var access_token = objBody.access_token;
                redisCache.saveDataTime(obj, access_token, 7190);
                callBack && callBack(access_token);
            } else {
                callBack && callBack({
                    code: body.errcode || -1,
                    msg: body.errmsg || "client_credential获取失败！"
                });
            }
        });
    }
}

module.exports = router;
