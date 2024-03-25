/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-09 18:33:27
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-18 14:51:12
 * @FilePath: \ksbm\routes\third\hikyun.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 测温云平台 hikyun  海康
'use strict';
var router = require('express').Router();
var hikyunFun = require("./hikyunFun");

// Todo list
router.get('/', function(req, res, next) {
    console.log("hikyun_get", req.query);
    res.json({code: 0, data: req.query});
});

// Creates a new todo item.
router.post('/', function(req, res, next) {
    var params = req.body;
    // var cmd = params.cmd;
    // if (cmd != "heart beat") {
    //非心跳请求
    hikyunFun.savePassLog(params);
    // }
    res.json({
        code: "200",
        msg: "操作成功",
        data: null
    });
    console.log("hikyun_post:", JSON.stringify(params));
});

//添加人员授权
router.post('/addPerson', function(req, res, next) {
    //console.log("post:", req.body);
    var params = req.body || {};
    var ret = hikyunFun.addPerson([{
        id: 1,
        name: params.name,
        idCard: params.idCard,//"350124198011152855",
        endTime: params.endTime || "2099-05-10"
    }], [params.sn || "J75246808"])
    res.json({code: 0, data: ret});
});

//清除单个设备的授权
router.post('/clear', async function(req, res, next) {
    console.log("post:", req.body);
    var params = req.body || {};
    var ret = await hikyunFun.clearAuthorize([params.sn || "J75246808"]);
    res.json(ret);
});

//按方案添加人员授权
router.post('/addPersonProject', function(req, res, next) {
    var params = req.body || {};
    if (!params.prjId || !params.devNos) {
        res.json({
            code: -1,
            msg: "入参缺失"
        });
        return;
    }
    var ret = hikyunFun.addPersonProject(params);
    res.json({code: 0, msg:"操作成功"});
});

module.exports = router;
