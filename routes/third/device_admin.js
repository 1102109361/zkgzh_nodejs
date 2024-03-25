/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-09 08:37:07
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-18 12:05:35
 * @FilePath: \ksbm\routes\third\hasx.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
//设备管理
'use strict';
var router = require('express').Router();
var device_db = require('./device_db');

//设备下发通行人员界面
router.get("/pushPersonPage", async (req, res) => {
    res.render('dev/pushPersonPage');
});

//获取指定日期的考试安排
router.get("/getExamPrjs", async (req, res) => {
    var params = req.query;
    var examTime = params.examTime;
    if (!examTime) {
        res.json({
            code: -1,
            msg: "考试日期为空"
        });
        return;
    }
    var list = await device_db.getExamPrjs(examTime);
    res.json({
        code: 0,
        data: list
    });
});

//获取设备列表
router.get("/getDevs", async (req, res) => {
    var params = req.query;
    var kind = params.kind;
    var list = await device_db.getDevs(kind);
    res.json({
        code: 0,
        data: list
    });
});

module.exports = router;
