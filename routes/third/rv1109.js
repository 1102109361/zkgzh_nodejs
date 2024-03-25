/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-09 18:33:27
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-18 17:52:31
 * @FilePath: \ksbm\routes\third\rv1109.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 福州伟拓人脸测温 https://shimo.im/docs/KlkKVpPZGKcGNKqd/
'use strict';
var router = require('express').Router();
var rv1109Fun = require("./rv1109Fun");

// Todo list
router.get('/', function(req, res, next) {
    console.log("rv1109_get", req.query);
    res.json({code: 0, data: req.query});
});

// Creates a new todo item.
router.post('/', function(req, res, next) {
    var params = req.body;
    // var cmd = params.cmd;
    // if (cmd != "heart beat") {
    //非心跳请求
    rv1109Fun.savePassLog(params);
    // }
    res.json({
        code: "200",
        msg: "操作成功",
        data: null
    });
    console.log("rv1109_post:", JSON.stringify(params));
});

//设备登录
router.post("/device/login", async (req, res) => {
    console.log("device_login_rv1109", JSON.stringify(req.body));
    var params = req.body;
    var ret = {
        "code": 0,
        "dev_sno": params.dev_sno || "test001",
        "mqinfo": {
            "host": "121.4.33.143",
            "keepalive": 60,
            "login": "dev",
            "password": "public",
            "port": 1883,
            "qos": 1,
            "topic": params.dev_sno || "rv1109",
            "willTopic": "rv1109-W",
            "willContent": "rv1109-offline"
        },
        "msg": "登录成功",
        "success": true,
        "token": "d25d9c62103ebdc7c5993c4503eb0ec6"
    };
    console.log("login ret:", JSON.stringify(ret));
    res.json(ret);
});

//比对结果上传
router.post("/record/upload/online", async (req, res) => {
    var params = req.body;
    rv1109Fun.savePassLog(params);
    res.json({
        "code": 0,
        "msg": "上报成功",
        "success": true
    });
    params.capture_img = null;
    console.log("record_upload_online_rv1109", JSON.stringify(params));
});

//设备获取人员信息
router.post('/device/sync_person', function(req, res, next) {
    var params = req.body;
    console.log("sync_person_rv1109", JSON.stringify(params));
    var ret = {
        "code": 0,
        "msg": "OK",
        "offset": params.offset || 0,
        "person_list": [
            {
                "birthday": "",
                "ic_card": "",
                "id_card": "350124198011152855",
                "person_id": 2,
                "person_name": "刘必渠",
                "person_type": "4",
                //"passAlgo": true,
                "sex": 1,
                "templateImgUrl": ["http://img.ksbm.fjrst.cn/372901198308267852.jpg"],
                "throughDateFrom": "",
                "throughMomentFrom": "",
                "throughDateTo": "",
                "throughMomentTo": "",
                "TimeGroupId": ""
            }
        ],
        "success": true
    };
    res.json(ret);
});

//云端指令执行完成回调
router.post('/device/notify', function (req, res, next) {
    var params = req.body;
    console.log("device/notify_rv1109", JSON.stringify(params));
    res.json({
        "code": 0,
        "msg": "OK",
        "success": true
    });
});

module.exports = router;
