const express = require('express')
const wxapi = require('../work/wxapi')
const router = express.Router()
var WxCommon = require('../common/wx_common');//微信操作相关的公共方法
var wxMps = JSON.parse(process.env.WXMP_KSBM || '{}');
var mp_appid = wxMps.mp_appid;
var mp_secret = wxMps.mp_secret;
router.get('/', async function (req, res, next) {
    res.render('index', {})
})

router.post('/sec', async function (req, res, next) {
    let result = {
        errcode: 0,
        errmsg: 'ok'
    }
    const text = req.body.content || null
    if (text != null) {
        result = await wxapi.call('wxa/msg_sec_check', {
            content: text
        })
    }
    res.json(result)
});

//代理接口请求
router.post("/call", async (req, res, newxt) => {
    var body = req.body;
    var apiUrl = body.url;
    var data = body.data;
    var result = await wxapi.call(apiUrl, data);
    res.json({
        code: 0,
        data: result
    });
});


//获取公众号动态二维码
// router.post("/getMPgetQRCode", async (req, res, newxt) => {
//     console.log('getMPgetQRCode调用');
//     var body = req.body;
//     var result = await wxapi.call('cgi-bin/qrcode/create', body);
//     res.json({
//         code: 0,
//         data: result
//     });
// });

// //推送公众号消息
router.post("/pushMPMOdelMsg", async (req, res, newxt) => {
    var body = req.body;
    // console.log(body,'bodyyy');
    var result = await wxapi.call('cgi-bin/message/template/send', body);
    res.json({
        code: 0,
        data: result
    });
});


router.post("/KSBMSsetWxMenuBtns", async (req, res, newxt) => {
    var btns = {
        "button": [{
            "name": "职等你来",
            "sub_button": [{
                "type": "view",
                "name": "事业招考资讯",
                "url": "https://ksbmmp.fjrst.cn/mp/ZX"
            }, {
                "name": "事业招考报名",
                "type": "miniprogram",
                "url": "https://ksbmmp.fjrst.cn/mp/ZX",
                "appid": "wx09103ce6a3d17f8d",
                "pagepath": "pages/index"
            }, {
                "name": "大数据集团招聘",
                "type": "miniprogram",
                "url": "https://ksbmmp.fjrst.cn/mp2/ZX",
                "appid": "wxe8a7286c786ad9b6",
                "pagepath": "pages/index"
            }, {
                "name": "国企招聘",
                "type": "miniprogram",
                "url": "https://ksbmmp.fjrst.cn/mp2/ZX",
                "appid": "wxdc280ee1a47a47fe",
                "pagepath": "pages/index"
            }]
        }, {
            "name": "在线客服",
            "sub_button": [{
                "name": "事业招考",
                "type": "view",
                // "url": "https://ksbmmp.fjrst.cn/mp/CS"
                "url": "https://gn5fexzypfeds.cschat.antcloud.com.cn/index.htm?tntInstId=3zR_8yH9&scene=SCE01214848"
            }, {
                "name": "大数据集团招聘",
                "type": "view",
                "url": "https://ksbmmp.fjrst.cn/mp/CS"
            }, {
                "name": "国企招聘",
                "type": "view",
                "url": "https://ksbmmp.fjrst.cn/mp/CS"
            }]
        }]
    };
    var params = req.body;
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
module.exports = router
