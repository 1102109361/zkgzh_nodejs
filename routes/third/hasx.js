/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-09 08:37:07
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-17 10:52:19
 * @FilePath: \ksbm\routes\third\hasx.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 成都华安视讯 HASX
'use strict';
var router = require('express').Router();
var hasxFun = require("./hasxFun");

// Todo list
router.get('/', function(req, res, next) {
    console.log("hasx_get", req.query);
    res.json({code: 0, data: req.query});
});

// Creates a new todo item.
router.post('/', function(req, res, next) {
    var params = req.body;
    var cmd = params.cmd;
    if (cmd != "heart beat") {
        //非心跳请求
        // console.log("hasx_post:", params);
        hasxFun.savePassLog(params);
    }
    res.json({
        "reply": "ACK",
        "cmd": params.cmd,
        "code": 0,
        "sequence_no": params.sequence_no,
        "cap_time": params.cap_time
    });
});

module.exports = router;
