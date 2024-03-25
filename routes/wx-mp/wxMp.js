var AV = require('leanengine');
var _ = require('lodash');
// var redisCache = require('../leancache/cache');
var request = require('request');
var WxCommon = require('../../common/wx_common');//微信操作相关的公共方法
var WxDbHelper = require('./wx_db');//微信操作相关的公共方法

var wxMps = JSON.parse(process.env.WXMP_KSBM || '{}');
var mp_appid = wxMps.mp_appid;
var mp_secret = wxMps.mp_secret;

//http://zhxy.fjtcwl.com/zhxy/wxAuthUserInfo--微信上传学生人脸
//事业 招聘动态 原url https://mp.ksbm.fjrst.cn/mp/SZ
//国企 招聘动态 原url https://mp.ksbm.fjrst.cn/mp1/SZ
//事业招考岗位查询
// {
//     "name": "岗位查询",
//     "type": "miniprogram",
//     "url": "https://mp.ksbm.fjrst.cn/mp/ZX",
//     "appid": "wx08e1a0a9f418898a",
//     "pagepath": "pages/positionQuery/positionQuery"
// },
var btns = {
    "button": [{
        "name": "事业招考",
        "sub_button": [{
            "type": "view",
            "name": "招聘资讯",
            "url": "https://ksbmmp.fjrst.cn/mp/ZX"
        }, {
            "name": "事业招考",
            "type": "miniprogram",
            "url": "https://ksbmmp.fjrst.cn/mp/ZX",
            "appid": "wx08e1a0a9f418898a",
            "pagepath": "pages/index"
        }, {
            "type": "view",
            "name": "招聘资讯（新）",
            "url": "https://ksbmmp.fjrst.cn/mp2/ZX"
        }, {
            "name": "事业招考（新）",
            "type": "miniprogram",
            "url": "https://ksbmmp.fjrst.cn/mp2/ZX",
            "appid": "wxe8a7286c786ad9b6",
            "pagepath": "pages/index"
        }]
    }, {
        "name": "国企招考",
        "sub_button": [{
            "type": "view",
            "name": "招聘资讯",
            "url": "https://ksbmmp.fjrst.cn/mp1/ZX"
        }, {
            "name": "岗位查询",
            "type": "miniprogram",
            "url": "https://ksbmmp.fjrst.cn/mp1/ZX",
            "appid": "wxdc280ee1a47a47fe",
            "pagepath": "pages/positionQuery/positionQuery"
        }, {
            "name": "我的报考",
            "type": "miniprogram",
            "url": "https://ksbmmp.fjrst.cn/mp1/ZX",
            "appid": "wxdc280ee1a47a47fe",
            "pagepath": "pages/index"
        }]
    }, {
        "name": "在线客服",
        "sub_button": [{
            "name": "事业报考",
            "type": "view",
            "url": "https://gn5fexzypfeds.cschat.antcloud.com.cn/index.htm?tntInstId=3zR_8yH9&scene=SCE01214848"
        }, {
            "name": "国企报考",
            "type": "view",
            "url": "https://cschat.antcloud.com.cn/index.htm?tntInstId=n6U_okUk&scene=SCE01227314#/"
        }]
    }]
};

//微信自定义菜单创建
AV.Cloud.define("KSBMSsetWxMenuBtns", function (req, res) {
    var params = req.params;
    var myBtns = params.myBtns;
    var appid = mp_appid;
    var secret = mp_secret;
    if (params.appid) {
        appid = params.appid;
        secret = wxMps[appid].secret;
    }
    if (!myBtns) {
        myBtns = btns;
    }
    WxCommon.creatMyBtns({
        myBtns: myBtns,
        appid: appid,
        secret: secret
    }, function (ret) {
        res.success(ret);
    });
});
//微信自定义菜单获取
AV.Cloud.define("KSBMSgetWxMenuBtns", function (req, res) {
    var params = req.params;
    var appid = mp_appid;
    var secret = mp_secret;
    if (params.appid) {
        appid = params.appid;
        secret = wxMps[appid].secret;
    }
    WxCommon.getMyMenu({
        appid: appid,
        secret: secret
    }, function (ret) {
        res.success(ret);
    });
});

//获取公众号素材列表
/*
{
    "appid":"",
    "datas":{
        "type":"image",
        "offset":0,
        "count":20
    }
}
*/
AV.Cloud.define("KSBMSgetMpMedias", function (req, res) {
    var params = req.params;
    var appid = mp_appid;
    var secret = mp_secret;
    if (params.appid) {
        appid = params.appid;
        secret = wxMps[appid].secret;
    }
    WxCommon.getMedias({
        appid: appid,
        secret: secret,
        datas: params.datas
    }, function (ret) {
        res.success(ret);
    });
});

//同步公众号关注人员信息
AV.Cloud.define("KSBMsyncMpFollowers", function (req, res) {
    var params = req.params;
    var appid = mp_appid;
    var secret = mp_secret;

    if (params.appid) {
        appid = params.appid;
        secret = wxMps[appid].secret;
    }
    res.success("ok");
    var openIds = [];//所有的OpenIDS
    WxCommon.getFollowers({
        appid: appid,
        secret: secret,
        openid: ""
    }, getUserInfo);

    function getUserInfo(ret) {
        var nextOpenId = ret.next_openid;
        openIds = openIds.concat(ret.data.openid || []);
        if (openIds.length < ret.total) {
            //翻页
            /* WxCommon.getFollowers({
                 appid: appid,
                 secret: secret,
                 openid: nextOpenId
             }, getUserInfo);*/
        } else { //获取到全部的关注者后
            // console.log("getUserInfo 所有的openIds:", openIds.length);
            // return;
            WxCommon.batchGetUsers(openIds, async function (users) {
                try {
                    for (let node of users) {
                        if (!node || !node.unionid) continue;
                        await WxDbHelper.updateWxUserInfoUnionidMySql(appid, node);
                    }
                } catch (e) {
                    console.error("err", e);
                }
            });
        }
    }
});

//获取所有的公众号标签列表
AV.Cloud.define("KSBMSMpTags", function (req, res) {
    WxCommon.getAccess_token(mp_appid, mp_secret, function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/tags/get?access_token=" + token;

        request(url, function (err, response, body) {
            if (err) {
                res.json(err);
                return;
            }
            if (response && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('getFollowers JSON解析错误', e);
                }
                res.success(body);

                if (body.errcode) {
                    return console.error("KSBMSMpTags", body);
                }

            } else {
                res.error({ code: -1, msg: "获取失败" });
            }
        });
    });
});

//同步公众号关注人员信息
AV.Cloud.define("KSBMSMpCreateTags", function (req, res) {
    var name = req.params.name;
    if (!name) {
        res.error({ code: -1, msg: '请输入标签名称' });
        return;
    }
    var postData = { "tag": { "name": name } };
    WxCommon.getAccess_token(mp_appid, mp_secret, function (token) {
        var url = "https://api.weixin.qq.com/cgi-bin/tags/create?access_token=" + token;
        request.post({
            url: url,
            form: JSON.stringify(postData),
            json: true,
            method: "POST"
        }, function (err, response, body) {
            if (err) {
                res.json(err);
                return;
            }
            if (response && response.statusCode == 200) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('FDSMpCreateTags JSON解析错误', e);
                }
                res.success(body);

                if (body.errcode) {
                    return console.error("KSBMSMpTags", body);
                }

            } else {
                res.error({ code: -1, msg: "获取失败" });
            }
        });
    });
})

//获取本学校所有已关注公众号的家长列表
function getMpPayUsers(cb) {
    var backList = [];
    // loadList(1, 1000);

    // function loadList(page, rows) {
    //     redisCache.getDataJson({
    //         name: "HIS_PayWeixin",
    //         rows: rows,
    //         page: page
    //     }, doQuery, function (data) {
    //         backList = backList.concat(data);
    //         if (data.length == rows) {
    //             // cb && cb(null, backList);
    //             loadList(page + 1, rows);
    //         } else {
    //             // console.log("递归获取通行日志的返回：", new Date().getTime());
    //             cb && cb(null, backList);
    //         }
    //     });
    //
    //     function doQuery(callBack) {
    //         var skip = (page - 1) * rows;
    //         var cql = "select * from FDWeiXinOrder  where status in(2,9) and openid is exists ";  //仅学生通行需要统计
    //         cql += " limit " + skip + "," + rows + " order by +createdAt"
    //         var st = new Date().getTime();
    //         AV.Query.doCloudQuery(cql).then(function (ret) {
    //             console.log("查询单个学校单次所有记录st", cql);
    //             var et = new Date().getTime();
    //             console.log("查询单个学校单次所有本次耗时et-st", (et - st) / 1000, '数据量：', ret.results.length, '总数：', ret.count);
    //             callBack(ret.results);
    //         }).catch(function (err) {
    //             cb && cb(err);
    //         });
    //     }
    // }
}

//同步给公众号用户打付款类型及已订阅标签
AV.Cloud.define("KSBMSMpUpdatePayUserTags", async function (req, res) {
    getMpPayUsers(function (err, list) {
        if (err) {
            res.error(err);
            return;
        }
        var allOpenids = list.map(item => {
            return item.openid;
        });
        allOpenids = _.compact(allOpenids);

        res.success({ code: 0, msg: '', count: list.length, dataCount: allOpenids.length });

        /* var arrGroup = _.chunk(allOpenids, 50);//所有用户增加 122 订阅用户的标签
         _.each(arrGroup, function(arrOpenids) {
             WxCommon.batchTagging(arrOpenids, tagid, 0, function(err, data) {
                 console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
             })
         });*/

        //批量标注为过期订阅用户，并删除 订阅用户标签
        var payNotOver = _.filter(list, function (item) {
            // console.log('payover:', item.createdAt, typeof item.createdAt);
            var buyYear = item.buyYear || 1;
            if (buyYear == 1) { //购买一学期，则在2021年2月后创建的为有效
                return new Date(item.createdAt) > new Date('2021-02-01');
            } else { //购买2学期，则在2020年8月后创建的为有效
                return new Date(item.createdAt) > new Date('2020-08-01');
            }
        }).map(item => {
            return item.openid
        });
        console.log("批量标注期订阅用户", payNotOver.length);
        var arrGroup = _.chunk(payNotOver, 50);//
        _.each(arrGroup, function (arrOpenids) { //122 订阅用户
            WxCommon.batchTagging(arrOpenids, 122, 0, function (err, data) {
                console.log('批量打标签结果tagid=', 122, '更新数：', arrOpenids.length, err, data);
            })
        });

        var payOver = _.difference(allOpenids, payNotOver);
        var arrGroup = _.chunk(payOver, 50);// 批量标注为过期订阅用户 142
        console.log("批量标注为过期订阅用户，并删除订阅用户标签", payOver.length);
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, 142, 0, function (err, data) {
                console.log('批量打标签结果tagid=', 142, '更新数：', arrOpenids.length, err, data);
            });
            WxCommon.batchTagging(arrOpenids, 122, 1, function (err, data) {
                console.log('批量取消签结果tagid=', 122, '更新数：', arrOpenids.length, err, data);
            });
        });
        // return;
        var pay1_1 = _.filter(list, function (item) {
            return item.buyYear == 1 && item.type == 1;
        }).map(item => {
            return item.openid
        });
        console.log("123  1学期1家长", pay1_1.length);
        var tagid = 123; //1学期1家长
        var arrGroup = _.chunk(pay1_1, 50);//所有用户增加123  1学期1家长
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

        var pay1_2 = _.filter(list, function (item) {
            return item.buyYear == 1 && item.type == 2;
        }).map(item => {
            return item.openid
        });
        console.log("124  1学期2家长", pay1_2.length);
        tagid = 124;
        var arrGroup = _.chunk(pay1_2, 50);//所有用户增加123  1学期1家长
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

        var pay1_3 = _.filter(list, function (item) {
            return item.buyYear == 1 && item.type == 3;
        }).map(item => {
            return item.openid
        });
        console.log("125  1学期3家长", pay1_3.length);
        tagid = 125;
        var arrGroup = _.chunk(pay1_3, 50);//所有用户增加123  1学期1家长
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

        var pay2_1 = _.filter(list, function (item) {
            return item.buyYear == 2 && item.type == 1;
        }).map(item => {
            return item.openid
        });
        console.log("126  2学期1家长", pay2_1.length);
        tagid = 126;
        var arrGroup = _.chunk(pay2_1, 50);//所有用户增加123  1学期1家长
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

        var pay2_2 = _.filter(list, function (item) {
            return item.buyYear == 2 && item.type == 2;
        }).map(item => {
            return item.openid
        });
        console.log("127  2学期2家长", pay2_2.length);
        tagid = 127;
        var arrGroup = _.chunk(pay2_2, 50);//所有用户增加123  1学期1家长
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

        var pay2_3 = _.filter(list, function (item) {
            return item.buyYear == 2 && item.type == 3;
        }).map(item => {
            return item.openid
        });
        console.log("128  2学期3家长", pay2_3.length);
        tagid = 128;
        var arrGroup = _.chunk(pay2_3, 50);//所有用户增加123  1学期1家长
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

    });
})


//同步给公众号用户打教师标签
//{"orgId":"5e5ee3a521b47e0081e7297b"}
AV.Cloud.define("KSBMSMpUpdateTeacherUserTags", async function (req, res) {
    getTeacherUsers(function (err, list) {
        if (err) {
            res.error(err);
            return;
        }
        var allOpenids = list.map(item => {
            return item.openid;
        });
        var tagid = 132;
        allOpenids = _.compact(allOpenids);
        console.log('FDSMpUpdateTeacherUserTags同步给公众号用户打标签ID:', tagid, '人数', allOpenids.length);
        res.success({ code: 0, msg: '', count: list.length, dataCount: allOpenids.length });

        var arrGroup = _.chunk(allOpenids, 50);//所有用户增加 122 订阅用户的标签
        _.each(arrGroup, function (arrOpenids) {
            WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
            })
        });

    });
})

var ORG_TAG_ID = {
    "5e8e72916aba64000699d037": 103,
    "5f57553b75ef0f5c16ea13d5": 106,
    "5e79aca791db280095b1d9cd": 115,
    "5f5b401a2f890b59945b9c23": 116,
    "5f5b4020c2e6d3451e6ebc05": 117,
    "5f1e51af943da80006efdfef": 119,
    "5e4a5f020a8a84008165d713": 120,
    "5e5ee3a521b47e0081e7297b": 121
};

//同步给公众号用户教师学校的标签
//{"orgId":"5e5ee3a521b47e0081e7297b"}
AV.Cloud.define("KSBMSMpUpdateTeacherUserOrgTags", async function (req, res) {
    getTeacherUsers(function (err, list) {
        if (err) {
            res.error(err);
            return;
        }
        var arrOrgGroup = _.groupBy(list, item => {
            return item.orgId.objectId;
        });
        // console.log("group11:", arrOrgGroup);
        _.forIn(arrOrgGroup, (value, key) => {
            // console.log("group:", key);
            var allOpenids = value.map(item => {
                return item.openid;
            });
            var tagid = ORG_TAG_ID[key];
            allOpenids = _.compact(allOpenids);
            console.log('FDSMpUpdateTeacherUserOrgTags同步给公众号用户打标签ID:', key, tagid, '人数', allOpenids.length);
            res.success({ code: 0, msg: '', count: list.length, dataCount: allOpenids.length });

            var arrGroup = _.chunk(allOpenids, 50);//所有用户增加 122 订阅用户的标签
            _.each(arrGroup, function (arrOpenids) {
                WxCommon.batchTagging(arrOpenids, tagid, 0, function (err, data) {
                    console.log('批量打标签结果tagid=', tagid, '更新数：', arrOpenids.length, err, data);
                })
            });
        });
    });
});

//同步给公众号用户教师学校的标签
//{"orgId":"5e5ee3a521b47e0081e7297b"}
AV.Cloud.define("KSBMSMpUpdateTeacherRemark", async function (req, res) {
    getTeacherUsers(function (err, list) {
        if (err) {
            res.error(err);
            return;
        }
        // console.log("group11:", arrOrgGroup);
        for (var node of list) {
            // console.log("group:", key);
            var remark = node.name + "-" + node.mobile;
            var openid = node.openid;
            if (!openid) {
                console.log('openid为空：', JSON.stringify(node));
                return;
            }
            // var remark = classUserObj.name + "-" + (classUserObj.bindClassName || "").replace('（', "").replace("）", "") + "-" + node.title;
            WxCommon.updateRemark(openid, remark, function (err, data) {
                if (err) {
                    console.error('updateRemark error:', err);
                    return;
                }
                console.log('执行用户备注成功', data);
                return;
            })
        }
    });
});

/*

//获取微信JSAPI授权签名
AV.Cloud.define("getJSAPIConfig", function (req, res) {
    var url = req.params.url;
    var obj = {
        debug: false,
        appId: mp_appid,
        timestamp: new Date().getTime(),
        nonceStr: Math.random() + '',
        signature: '',
        jsApiList: ['updateTimelineShareData', 'updateAppMessageShareData', 'onMenuShareAppMessage', 'onMenuShareTimeline']
    };
    var signObj = {
        noncestr: obj.nonceStr,
        jsapi_ticket: "",
        timestamp: obj.timestamp,
        url: url
    };
    toget();

    function toget(isSecond) {
        WxCommon.getAccess_token(mp_appid, mp_secret, function (token) {
            if (token && token.code) {
                console.error('获取微信 token失败', token);
                return res.error(token);
            }
            // console.log('获取微信 token成功', token);
            getWxJSAPIticket(token, function (ticket) {
                // console.log('获取微信 ticket', ticket);
                if (ticket && ticket.code) {
                    if (ticket.code == 40001 && !isSecond) {
                        redisCache.delData({
                            name: "wxAccessToken",
                            apid: mp_appid
                        });
                        return toget(true);
                    }
                    return res.success(ticket);
                }
                signObj.jsapi_ticket = ticket;
                // console.log('signObj内容', JSON.stringify(signObj))
                var sign = WxCommon.getSign(signObj);
                obj.signature = sign;
                res.success(obj);
            });
        });
    }
});


//获取微信jsapi ticket
function getWxJSAPIticket(access_token, callBack) {
    var obj = {
        name: "wxJSAPIticket_FD_MP",
        apid: mp_appid
    };
    redisCache.getDataOnly(obj, function (ticket) {
        if (!ticket) {
            getTicket();
            return;
        }
        try {
            ticket = JSON.parse(ticket);
        } catch (e) {
            console.error("ticket", e);
        }
        callBack(ticket);
    });

    function getTicket() {
        var url1 = "https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=" + access_token + "&type=jsapi";
        request({
            url: url1,
            method: "GET",
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var body = JSON.parse(body);
                if (body.errcode) {
                    console.log("getTicket_token", body);
                    return callBack && callBack({
                        code: body.errcode || -1,
                        msg: "获取失败！"
                    });
                }
                var ticket = body.ticket;
                redisCache.saveDataTime(obj, ticket, 7190);
                callBack && callBack(ticket);
            } else {
                callBack && callBack({
                    code: -1,
                    msg: "获取失败！"
                });
            }
        });
    }
}
*/
