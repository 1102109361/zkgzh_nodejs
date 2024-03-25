/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-09 18:33:27
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-17 10:52:43
 * @FilePath: \ksbm\routes\third\newland.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 新大陆防疫设备上报对接 newland
'use strict';
var router = require('express').Router();
var newlandFun = require("./newlandFun");

// Todo list
router.get('/', function(req, res, next) {
    console.log("newland_get", req.query);
    res.json({code: 0, data: req.query});
});

// Creates a new todo item.
router.post('/', function(req, res, next) {
    var params = req.body;
    var cmd = params.cmd;
    if (cmd != "heart beat") {
        //非心跳请求
        console.log("newland_post:", params);
        // newlandFun.savePassLog(params);
    }
    res.json({code: 0, data: params});
});

//添加人员授权
router.post('/addPerson', function(req, res, next) {
    //console.log("post:", req.body);
    var params = req.body || {};
    var ret = newlandFun.addPerson([{
        name: params.name,
        idCard: params.idCard,//"350124198011152855",
        endTime: params.endTime || "2099-05-10"
    }], params.sn || "A8F470E13850")
    res.json({code: 0, data: ret});
});

//清除单个设备的授权
router.post('/clear', async function(req, res, next) {
    console.log("post:", req.body);
    var params = req.body || {};
    var ret = await newlandFun.clearAuthorize(params.sn || "A8F470E13850");
    res.json(ret);
});

module.exports = router;
