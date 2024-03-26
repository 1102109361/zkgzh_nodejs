var _ = require('lodash');
var crypto = require('crypto');
var request = require('request');
var redisCache = require('../leancache/cache');

var WeixinConfig = JSON.parse(process.env.WXMP_KSBM || '{}');
var mp_appid = WeixinConfig.mp_appid;
var mp_secret = WeixinConfig.mp_secret;
global.isGetToken = false;
const wxapi = require('../work/wxapi')

//获取微信access_token
function getAccess_token(theAppid, theSecret, callBack) {
    var obj = {
        name: "wxAccessToken",
        apid: theAppid
    };
    redisCache.getDataOnly(obj, function (token) {
        if (!token) {
            if (global.isGetToken) {
                console.log("阻止获取新token", theAppid, token);
                return callBack({
                    code: -1,
                    msg: "请求失败，请重试"
                });
            }
            global.isGetToken = true;
            console.log("获取新token", theAppid, token);
            return getToken();
        }
        try {
            token = JSON.parse(token);
        } catch (e) {
            console.error('getAccess_token JSON解析错误', e);
        }
        console.log("redis_TOKEN", token);
        callBack(token);
    });

    function getToken() {
        var url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + theAppid + "&secret=" + theSecret;
        request({
            url: url,
            method: "GET",
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var body = JSON.parse(body);
                if (body.errcode) {
                    if (body.errcode == 40164) {
                        console.error("微信公众号白名单未配置", theAppid, JSON.stringify(body));
                    } else {
                        console.log("请求Token失败", theAppid, JSON.stringify(body));
                    }
                    global.isGetToken = false;
                    callBack && callBack({ code: -1, msg: "获取微信Token失败！", data: body });
                    return;
                }
                var access_token = body.access_token;
                redisCache.saveDataTime(obj, access_token, 7190);
                console.warn("====请求到新的token:", theAppid, access_token);
                global.isGetToken = false;
                callBack && callBack(access_token);
            } else {
                global.isGetToken = false;
                console.error("FDSgetAccess_token_wxMp", { code: -1, msg: "获取失败！" });
            }
        });
    }
}

function getSign(obj) {
    // 参数数组
    var arr = [];
    // 循环添加参数项
    for (var p in obj) {
        if (p == "sign") {
            continue;
        }
        var v = obj[p];
        if (typeof (v) == "object") {
            v = JSON.stringify(v);
        }
        arr.push(p + "=" + v);
    }
    // 2、按首字母升序排列
    arr.sort();
    // 3、连接字符串
    var signStr = arr.join('&');
    var sha1 = crypto.createHash("sha1");
    sha1.update(signStr);
    return sha1.digest('hex');
}

//获取微信用户信息
function batchGetAllUsers(params, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    var appid = params.appid;
    var secret = params.secret;
    var openids = params.openIds;
    var maxLength = openids.length;
    var allUsers = [];
    if (openids.length > 100) {
        //一次最多获取100个用户做分页拉取
        var l = parseInt(maxLength / 100 + 1);
        for (var i = 0; i < l; i++) {
            getUsers(openids.splice(0, 100));
        }
    } else {
        getUsers(openids);
    }

    function getUsers(theOpenids) {
        getAccess_token(appid, secret, function (token) {
            var obj = {
                user_list: []
            };
            _.each(theOpenids, function (openid) {
                obj.user_list.push({
                    "openid": openid,
                    "lang": "zh_CN"
                });
            });
            var url = "https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=" + token;
            request({
                url: url,
                form: JSON.stringify(obj),
                json: true,
                method: "POST"
            }, function (err, response, body) {
                if (!err && response.statusCode == 200) {
                    try {
                        body = JSON.parse(body);
                    } catch (e) {
                        console.error('getUsers JSON解析错误', e);
                    }
                    if (body.errcode == 40001) {
                        console.error("wx_common.js->batchGetUsers", appid, JSON.stringify(obj), body);
                        // //token失效重试一次
                        if (tryTimes > 3) {
                            redisCache.delData({
                                name: "wxAccessToken",
                                apid: appid
                            });
                        } else {
                            tryTimes += 1;
                        }
                        return batchGetUsers(params, callBack, tryTimes);
                    }
                    if (body.errcode) {
                        return console.error("batchGetUsers2", body);
                    }
                    var users = body.user_info_list;
                    allUsers = allUsers.concat(users);
                    if (allUsers.length == maxLength) {
                        callBack(allUsers);
                    }
                } else {
                    console.error("batchGetUsers1", {
                        code: -1,
                        msg: "获取失败"
                    });
                }
            });
        });
    }
}


//获取微信用户信息
function batchGetUsers(openids, callBack, tryTimes) {
    getAccess_token(mp_appid, mp_secret, function (token) {
        var arrGroup = _.chunk(openids, 100);
        console.log("batchUsers:", openids.length, '分成组次：', arrGroup.length)
        for (var userList of arrGroup) {
            batchGetUser100(userList, token, callBack, tryTimes);
        }
    });
}

//接口最多只能一次拉100条
function batchGetUser100(openids, token, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    var obj = {
        user_list: []
    };
    _.each(openids, function (openid) {
        obj.user_list.push({
            "openid": openid,
            "lang": "zh_CN"
        });
    });
    var url = "https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=" + token;
    request({
        url: url,
        form: JSON.stringify(obj),
        json: true,
        method: "POST"
    }, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            if (typeof (body) == "string") {
                //字符串类型的数据才进行解析
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error("batchGetUsers_prase:" + body, e);
                }
            }
            if (body.errcode == 40001) {
                //token失效重试一次
                if (tryTimes > 3) {
                    redisCache.delData({
                        name: "wxAccessToken",
                        apid: mp_appid
                    });
                } else {
                    tryTimes += 1;
                }
                return batchGetUsers(openids, callBack, tryTimes);
            }
            if (body.errcode) {
                console.error("batchGetUsers3", mp_appid, JSON.stringify(obj), body);
                return
            }
            var users = body.user_info_list;
            callBack && callBack(users);
        } else {
            callBack && callBack({ code: -1, msg: "获取失败" });
        }
    });
}

//获取公众号关注的人
function getFollowers(params, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    var appid = params.appid;
    var secret = params.secret;
    var next_openid = params.openid;
    getAccess_token(appid, secret, function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/user/get?access_token=" + token;
        if (next_openid) {
            url += "&next_openid=" + next_openid;
        }
        request(url, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('getFollowers JSON解析错误', e);
                }
                if (body.errcode == 40001) {
                    //token失效重试3次
                    if (tryTimes > 3) {
                        redisCache.delData({
                            name: "wxAccessToken",
                            apid: appid
                        });
                    } else {
                        tryTimes += 1;
                    }
                    return getFollowers(params, callBack, tryTimes);
                }
                if (body.errcode) return console.error("获取公众号用户列表getFollowers", appid, body);
                callBack(body);
            } else {
                console.log("err", err, body);
                // res.json({
                //     code: -1,
                //     msg: "获取失败"
                // });
            }
        });
    });
}

function batchTagging(arrOpenId, tagid, type, cb) {
    if (arrOpenId && arrOpenId.length == 0) {
        cb && cb({ code: -1, msg: "openid列表为空" });
        return;
    }
    if (!tagid || tagid == 0) {
        cb && cb({ code: -1, msg: "标签id为空" });
        return;
    }
    getAccess_token(mp_appid, mp_secret, function (token) {
        if (token && token.code) {
            console.error("请求微信Token失败", token);
            return;
        }
        var url = "https://api.weixin.qq.com/cgi-bin/tags/members/batchtagging?access_token=" + token;
        if (type == 1) {//取消标签
            url = "https://api.weixin.qq.com/cgi-bin/tags/members/batchuntagging?access_token=" + token;
        }
        var postData = { "openid_list": arrOpenId, "tagid": tagid };
        request.post({
            url: url,
            form: JSON.stringify(postData),
            json: true,
            method: "POST"
        }, function (err, response, body) {
            if (err) {
                console.error("批量打微信用户标签", tagid, arrOpenId.length, err);
                cb && cb(err);
                return;
            }
            if (response && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    //console.error('batchTagging JSON解析错误', body);
                }

                if (body.errcode != 0) {
                    if (body.errcode == 40001) {
                        //token失效重试一次
                        // redisCache.delData({
                        //     name: "wxAccessToken",
                        //     apid: mp_appid
                        // });
                        console.error("batchTagging重置微信Token");
                        return;
                    }
                    console.error("FDSMpTags:token=", mp_appid, mp_secret, "|", token, "|body=", JSON.stringify(body));
                    cb && cb(body);
                } else {
                    cb && cb(null, body);
                }
            } else {
                cb && cb({ code: -1, msg: "获取失败" });
            }
        });
    });
}


function httprequest(option) {
    return new Promise((resolve, reject) => {
        request(option, function (error, response, body) {
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

function updateRemark(openid, remark, cb) {
    if (!openid && !remark) {
        cb && cb({ code: -1, msg: "openid列表为空" });
        return;
    }
    getAccess_token(mp_appid, mp_secret, async function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/user/info/updateremark?access_token=" + token;
        var postData = { "openid": openid, "remark": remark };

        try {
            var ret = await httprequest({
                url: url,
                form: JSON.stringify(postData),
                json: true,
                method: "POST"
            });
            ret.data = postData;
            cb && cb(null, ret);
        } catch (e) {
            console.error("更新用户备注失败", e);
        }
    });
}


//查询自定义菜单
function getMyMenu(params, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    var appid = params.appid;
    var secret = params.secret;
    getAccess_token(appid, secret, function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/menu/get?access_token=" + token;
        request({
            url: url,
            method: "GET"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('getMyMenu JSON解析错误', e);
                }
                if (body.errcode == 40001) {
                    console.error("getMyMenu", body);
                    //token失效重试一次
                    if (tryTimes > 3) {
                        redisCache.delData({
                            name: "wxAccessToken",
                            apid: appid
                        });
                    } else {
                        tryTimes += 1;
                    }
                    return getMyMenu(params, callBack, tryTimes);
                }
                callBack && callBack(body);
            } else {
                callBack({
                    code: -1,
                    msg: "获取失败"
                });
            }
        });
    });
}

//获取公众号素材列表
function getMedias(params, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    var appid = params.appid;
    var secret = params.secret;
    var datas = params.datas;
    getAccess_token(appid, secret, function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=" + token;
        request({
            url: url,
            form: JSON.stringify(datas),
            json: true,
            method: "POST"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('creatMyBtns JSON解析错误', e);
                }
                if (body.errcode == 40001) {
                    console.error("creatMyBtns", body);
                    //token失效重试一次
                    if (tryTimes > 3) {
                        redisCache.delData({
                            name: "wxAccessToken",
                            apid: appid
                        });
                    } else {
                        tryTimes += 1;
                    }
                    return creatMyBtns(params, callBack, tryTimes);
                }
                callBack && callBack(body);
            } else {
                callBack({
                    code: -1,
                    msg: "获取失败"
                });
            }
        });
    });
}

//自定义菜单
function creatMyBtns(params, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    var myBtns = params.myBtns;
    var appid = params.appid;
    var secret = params.secret;
    getAccess_token(appid, secret, function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/menu/create?access_token=" + token;
        request({
            url: url,
            form: JSON.stringify(myBtns),
            json: true,
            method: "POST"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body, 'creatMyBtns body');
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('creatMyBtns JSON解析错误', e);
                }
                console.error("creatMyBtns", body);
                if (body.errcode == 40001) {
                    console.error("creatMyBtns", body);
                    return
                    //token失效重试一次
                    if (tryTimes > 3) {
                        redisCache.delData({
                            name: "wxAccessToken",
                            apid: appid
                        });
                    } else {
                        tryTimes += 1;
                    }
                    return creatMyBtns(params, callBack, tryTimes);
                }
                callBack && callBack(body);
            } else {
                callBack({
                    code: -1,
                    msg: "获取失败"
                });
            }
        });
    });
}
//公众号动态二维码获取
function getQRCode(data, callBack, tryTimes) {
    tryTimes = tryTimes || 0;
    // getAccess_token(mp_appid, mp_secret, function (token) {
    //console.log("getQRCode_token", data, token);
    // if (token.code) {
    //     callBack(token);
    //     return;
    // }

    var obj = {
        name: "MPQrcode",
        appid: mp_appid,
        idCard: data.action_info.scene.scene_str
    };
    redisCache.getDataOnly(obj, function (newUrl) {
        if (!newUrl) {
            getUrl();
            return;
        }
        try {
            newUrl = JSON.parse(newUrl);
        } catch (e) {
        }
        callBack({
            code: 0,
            msg: "ok",
            data: newUrl
        });
    });


    async function getUrl() {
        //请求到微信云托管服务
        var body1 = data
        var result = await wxapi.call('cgi-bin/qrcode/create', body1);
        // var body = result.data;
        var newUrl = result.url;
        redisCache.saveDataTime(obj, newUrl, 2591999);
        if (result.errcode) {
            callBack && callBack({
                code: -1,
                msg: "获取失败！"
            });
        } else {
            callBack && callBack({
                code: 0,
                msg: "ok",
                data: newUrl
            });
        }
        return
        request({
            url: global.wxCloudHost + "/getMPgetQRCode",
            body: data,
            json: true,
            method: "POST",
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (!body || body.code) {
                    console.error("getQRCode", body);
                    callBack && callBack({
                        code: -1,
                        msg: "获取失败！"
                    });
                    return;
                }
                body = body.data;
                var newUrl = body.url;
                redisCache.saveDataTime(obj, newUrl, 2591999);
                callBack && callBack({
                    code: 0,
                    msg: "ok",
                    data: newUrl
                });
            } else {
                callBack && callBack({
                    code: -1,
                    msg: "获取失败！"
                });
            }
        });
        return;
        var url = "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + token;
        request({
            url: url,
            form: JSON.stringify(data),
            json: true,
            method: "POST",
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (body.errcode) {
                    if (body.errcode == 40001) {
                        console.error("getQRCode异常：", token, JSON.stringify(body));
                        //token失效重试一次
                        if (tryTimes > 3) {
                            redisCache.delData({
                                name: "wxAccessToken",
                                apid: mp_appid
                            });
                        } else {
                            tryTimes += 1;
                        }
                        return getQRCode(data, callBack, tryTimes);
                    }
                    console.log("getQRCode", body);
                    return callBack && callBack({
                        code: -1,
                        msg: "获取失败！"
                    });
                }
                var newUrl = body.url;
                redisCache.saveDataTime(obj, newUrl, 2591999);
                callBack && callBack({
                    code: 0,
                    msg: "ok",
                    data: newUrl
                });
            } else {
                callBack && callBack({
                    code: -1,
                    msg: "获取失败！"
                });
            }
        });
    }
    // });
}

module.exports = {
    getAccess_token,
    getSign,
    batchGetUsers,
    batchGetAllUsers,
    getFollowers,
    batchTagging,
    updateRemark,
    getMyMenu,
    getMedias,
    creatMyBtns,
    getQRCode
}
