// 天川智慧校园公众号对接 服务号，微信号： haoke101
var router = require('express').Router();
// 引用 wechat 库，详细请查看 https://github.com/node-webot/wechat
var wechat = require('wechat');
//wechat-api 文档http://doxmate.cool/node-webot/wechat-api/api.html#api_api_common
var API = require('wechat-api');
var WxCommon = require('../../common/wx_common');//微信操作相关的公共方法
var redisCache = require('../../leancache/cache');
var UUID = require("uuid");
var WxDbHelper = require('./wx_db');//微信操作相关的公共方法

var WeixinConfig = JSON.parse(process.env.WXMP_KSBM || '{}');
var host = process.env.MP_PAGE_HOST;
var mp_appid = WeixinConfig.mp_appid;
var mp_secret = WeixinConfig.mp_secret;

if (process.env.MP_PAGE_HOST == "https://mp.ksbm.fjrst.cn") {
    require("./wxMp");//公众号部分云函数
}

API.patch("sendMiniCard", "https://api.weixin.qq.com/cgi-bin/message/custom/send");
/*{
    "touser":"OPENID",
    "msgtype":"miniprogrampage",
    "miniprogrampage":
    {
        "title":"title",
        "appid":"appid",
        "pagepath":"pagepath",
        "thumb_media_id":"thumb_media_id"
    }
}*/

var api = new API(mp_appid, mp_secret, function (callback) {
    // 传入一个获取全局token的方法
    WxCommon.getAccess_token(mp_appid, mp_secret, function (token) {
        console.log("accToen", token);
        callback(null, token);
    });
}, function (token, callback) {
    callback(null);
});
var wxConfig = {
    token: WeixinConfig.mp_token,
    appid: mp_appid,
    encodingAESKey: WeixinConfig.mp_encodingAESKey
};

//微信
router.use('/', wechat(wxConfig.token).text(function (message, req, res, next) {
    var content = message.Content;
    var openid = message.FromUserName;
    res.reply("");
}).image(function (message, req, res, next) {
    // message为图片内容
    res.reply("");
}).voice(function (message, req, res, next) {
    // message为音频内容
    res.reply("");
}).video(function (message, req, res, next) {
    // message为视频内容
    res.reply("");
}).shortvideo(function (message, req, res, next) {
    // message为短视频内容
    res.reply("");
}).location(function (message, req, res, next) {
    // message为链接内容
    res.reply("");
}).link(function (message, req, res, next) {
    // message为链接内容
    res.reply("");
}).event(async (message, req, res, next) => {
    console.log('微信公众号：', wxConfig.appid, JSON.stringify(message));
    // message为事件内容
    var openid = message.FromUserName;
    if (message.Event == "subscribe" && message.EventKey) {
        //扫描带参二维码
        var key = message.EventKey;
        if (key.indexOf("qrscene_BIND_") == 0) {
            var idCard = key.replace("qrscene_BIND_", "");
            scanQrCodeReply(openid, idCard);
        }
    }
    if (message.Event == "subscribe" || message.Event == "unsubscribe") {
        //微信服务号关注/取消关注公众号
        // WxCommon.batchGetUsers([openid], function (userInfos) {
        //     WxDbHelper.checkAndBindUser(message.Event, wxConfig.appid, userInfos[0]);
        // });
    }
    if (message.Event == "CLICK") {

    }
    if (message.Event == "TEMPLATESENDJOBFINISH") { //模板消息推送成功

    }
    if (message.Event == "SCAN") { //扫描带参数二维码事件(已关注）
        var key = message.EventKey;
        //扫码绑定微信
        if (key.indexOf("BIND_") == 0) {
            var idCard = key.replace("BIND_", "");
            scanQrCodeReply(openid, idCard);
        }
    }
    res.reply("");
}).device_text(function (message, req, res, next) {
    // message为设备文本消息内容
    res.reply("");
}).device_event(function (message, req, res, next) {
    // message为设备事件内容
    res.reply("");
}).middlewarify());


function scanQrCodeReply(openId, idCard) {
    var saveKey = "BIND_" + UUID.v1().replace(/-/g, "");
    redisCache.saveDataTime(saveKey, {
        openId: openId,
        idCard: idCard
    }, 3600);
    var p_url = `${host}/mp/bindUser?k=${saveKey}`;
    api.sendNews(openId, [{
        "title": "欢迎来到“福建招聘平台”",
        "description": ">>>戳此绑定  审核动态、考试信息、成绩查询实时掌握",
        "url": p_url,
        "picurl": `${host}/zplogo.png`
    }], function (err) {
        console.log(err);
    });
}

module.exports = router;
