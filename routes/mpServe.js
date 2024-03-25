// 天川智慧校园公众号对接 服务号，微信号： haoke101
var router = require('express').Router();
var secretOrPrivateKey = "wxMpReply"; // 这是加密的key（密钥）
var jwt = require('jsonwebtoken');
const request = require('request')

var host = process.env.MP_PAGE_HOST;
//微信公众号消息回复
/**
 * {
  "ToUserName": "gh_919b00572d95", // 小程序/公众号的原始ID，资源复用配置多个时可以区别消息是给谁的
  "FromUserName": "oVneZ57wJnV-ObtCiGv26PRrOz2g", // 该小程序/公众号的用户身份openid
  "CreateTime": 1651049934, // 消息时间
  "MsgType": "text", // 消息类型
  "Content": "回复文本", // 消息内容
  "MsgId": 23637352235060880 // 唯一消息ID，可能发送多个重复消息，需要注意用此 ID 去重
}
 */
router.post("/", async (req, res, next) => {
    var headers = req.headers;
    if (!headers["x-wx-source"]) {
        console.error("非微信内部请求", JSON.stringify(headers), JSON.stringify(req.body), JSON.stringify(req.query))
        res.json({
            code: 5005,
            message: "错误请求"
        });
        return;
    }
    var message = req.body;
    var MsgType = message.MsgType;
    var openid = message.FromUserName;
    var replyMsg;
    switch (MsgType) {
        case "text":
            if (message.Content.length == 18) {
                scanQrCodeReply(openid, message.Content);
            } else {
                replyMsg = replyText(message, "输入18位身份证号可以立即绑定帐号（需在平台先注册）");
            }
            break;
        case "event":
            if (message.Event == "subscribe" && message.EventKey) {
                //扫描带参二维码（未关注）
                var key = message.EventKey;
                if (key.indexOf("qrscene_BIND_GQ_") == 0) {
                    var idCard = key.replace("qrscene_BIND_GQ_", "");
                    scanQrCodeReply(openid, idCard, 2);
                } else if (key.indexOf("qrscene_BIND_ZK_") == 0) {
                    var idCard = key.replace("qrscene_BIND_ZK_", "");
                    scanQrCodeReply(openid, idCard, 3);   
                } else if (key.indexOf("qrscene_BIND_") == 0) {
                    var idCard = key.replace("qrscene_BIND_", "");
                    scanQrCodeReply(openid, idCard);
                }
            }
            if (message.Event == "SCAN") { //扫描带参数二维码事件(已关注）
                var key = message.EventKey;
                //扫码绑定微信
                if (key.indexOf("BIND_GQ_") == 0) {
                    var idCard = key.replace("BIND_GQ_", "");
                    scanQrCodeReply(openid, idCard, 2);
                } else if (key.indexOf("BIND_ZK_") == 0) {
                    var idCard = key.replace("BIND_ZK_", "");
                    scanQrCodeReply(openid, idCard, 3);
                } else if (key.indexOf("BIND_") == 0) {
                    var idCard = key.replace("BIND_", "");
                    scanQrCodeReply(openid, idCard);
                }
            }
            replyMsg = replyText(message, "");
            break;
        default:
            replyMsg = replyText(message, "");
    }
    res.json(replyMsg);
});

//回复文本消息
function replyText(obj, msg) {
    return {
        "ToUserName": obj.FromUserName,
        "FromUserName": obj.ToUserName,
        "CreateTime": parseInt(new Date().getTime() / 1000), // 整型，例如：1648014186
        "MsgType": "text",
        "Content": msg
    };
}


function scanQrCodeReply(openId, idCard, siteType) {
    var saveKey = jwt.sign({
        openId: openId,
        idCard: idCard
    }, secretOrPrivateKey, {
        expiresIn: 3600 // 1小时过期
    });
    if (siteType == 2) {// 国有企业招考平台
        var p_url = `${host}/mp1/bindUser?k=${saveKey}`;
        request({
            method: 'POST',
            url: 'http://api.weixin.qq.com/cgi-bin/message/custom/send',
            body: JSON.stringify({
                touser: openId, // 一般是消息推送 body 的FromUserName值，为用户的openid
                msgtype: "link",
                link: {
                    "title": "国企招考平台帐号绑定指引",
                    "description": ">>>戳此立即绑定  绑定后可实时了解审核动态、考试信息、成绩查询等信息",
                    "url": p_url,
                    "thumb_url": `${host}/zplogo.png`
                }
            })
        }, function (error, response) {
            if (error) {
                console.error("scanQrCodeReply", error);
            } else {
                console.log("scanQrCodeReply", response.body);
            }
        });
    } else if (siteType == 3) {
        var p_url = `${host}/mp2/bindUser?k=${saveKey}`;
        request({
            method: 'POST',
            url: 'http://api.weixin.qq.com/cgi-bin/message/custom/send',
            body: JSON.stringify({
                touser: openId, // 一般是消息推送 body 的FromUserName值，为用户的openid
                msgtype: "link",
                link: {
                    "title": "福建招考平台帐号绑定指引",
                    "description": ">>>戳此立即绑定  绑定后可实时了解审核动态、考试信息、成绩查询等信息",
                    "url": p_url,
                    "thumb_url": `${host}/zplogo.png`
                }
            })
        }, function (error, response) {
            if (error) {
                console.error("scanQrCodeReply", error);
            } else {
                console.log("scanQrCodeReply", response.body);
            }
        });
    } else {
        var p_url = `${host}/mp/bindUser?k=${saveKey}`;
        request({
            method: 'POST',
            url: 'http://api.weixin.qq.com/cgi-bin/message/custom/send',
            body: JSON.stringify({
                touser: openId, // 一般是消息推送 body 的FromUserName值，为用户的openid
                msgtype: "link",
                link: {
                    "title": "事业单位招考平台帐号绑定指引",
                    "description": ">>>戳此立即绑定  绑定后可实时了解审核动态、考试信息、成绩查询等信息",
                    "url": p_url,
                    "thumb_url": `${host}/zplogo.png`
                }
            })
        }, function (error, response) {
            if (error) {
                console.error("scanQrCodeReply", error);
            } else {
                console.log("scanQrCodeReply", response.body);
            }
        });
    }
}

module.exports = router;
