/*
 *  福建省国有企业公开招聘接口
 */
var router = require('express').Router();
var _ = require('lodash');
var UUID = require("uuid");
var jwt = require('jsonwebtoken');

var redisCache = require('../../leancache/cache3');
var WxCommon = require('../../common/wx_common');//微信操作相关的公共方法
var WxDbHelper = require('./wx_db3');//微信操作相关的公共方法
var Mpush = require('./mp_push3');
var siteWebUrl = '国企招聘平台https://gqzp.fjrst.cn/'
var siteWebName = '国企招聘平台'

var secretOrPrivateKey = "wxMpReply"; // 这是加密的key（密钥）

var picHost = process.env.PIC_HOST3;
//推送服务

//获取公众号动态二维码
router.post("/QRCode", async (req, res) => {
    var params = req.body;
    if (!params.idCard) {
        res.json({
            code: -1,
            msg: "入参缺失"
        });
        return;
    }
    var data = {
        "expire_seconds": 2592000,
        "action_name": "QR_STR_SCENE",
        "action_info": {
            "scene": {
                "scene_str": "BIND_SR_" + params.idCard
            }
        }
    };
    WxCommon.getQRCode(data, (bData) => {
        res.json(bData);
    });
});

//消息推送
router.post("/pushMsg", async (req, res) => {
    console.log('pushMsg2');
    var params = req.body;
    var type = params.type;//类型  10:考生报名提交成功   11 ：考生审核通知（包括通过、退回）     12：考生申请放弃     13：考生岗位考试时间冲突
    var appIds = params.appIds;//申请记录ID数组
    var userId = params.userId;//操作人ID
    var projectId = params.projectId;//方案ID
    if (!type || !userId || !appIds) {
        res.json({
            code: -1,
            msg: "type/appIds/userId入参缺失"
        });
        return;
    }
    console.log("pushMsg_申请记录数", type, userId, projectId, appIds.length);
    if (type == 17) {
        var applyObj = await WxDbHelper.getReviewPushList1(appIds);
    } else if (type == 18) {
        var applyObj = await WxDbHelper.getReviewPushList2(appIds);
    } else {
        var applyObj = await WxDbHelper.getApplyPushList(appIds);
    }
    if (!applyObj[0]) {
        console.error("未获取可以推送的报名信息或用户未绑定公众号", userId, JSON.stringify(params));
        res.json({
            code: -1,
            msg: "未获取可以推送的报名信息或用户未绑定公众号:" + JSON.stringify(appIds)
        });
        return;
    }
    res.json({
        code: 0,
        msg: `即将推送${applyObj.length} 条模板消息。类型${type}`
    });
    for (let n of applyObj) {
        // console.log("n", JSON.stringify(n));
        n.usp_id = UUID.v4()
        n.userId = userId;
        n.projectId = projectId;
        n.pushType = type;
        switch (type) {
            case 10://考生报名提交成功
                Mpush.pushSignSuccess(n.usr_openid, n);
                break;
            case 11://考生审核通知（包括通过、退回）
                if (n.app_status_show < 0 || n.app_status_picture < 0) { //报名失败或照片审核不通过通知
                    Mpush.pushSignAuditFail(n.usr_openid, n);
                } else { //报名结果通知
                    Mpush.pushSignAuditSuccess(n.usr_openid, n);
                }
                break;
            case 12://考生申请放弃
                Mpush.pushApplyBack(n.usr_openid, n);
                break;
            case 13://考生岗位考试时间冲突
                Mpush.pushSignAuditConflict(n.usr_openid, n);
                break;
            case 15://考生 考试成绩提醒
                Mpush.pushScoreTip(n.usr_openid, n);
                break;
            case 17://加分申请审核
                Mpush.pushBonusAudit(n.usr_openid, n);
                break;
            case 18://资格复审审核
                Mpush.pushReviewAudit(n.usr_openid, n);
                break;

        }
    }
});

router.post("/pushAuditMsg", async (req, res) => {
    var params = req.body;
    // console.log("pushAuditMsg_params", JSON.stringify(params));
    var type = params.type;//类型     21：提醒用人单位初审人员
    var userId = params.userId;//操作人ID
    var projectId = params.projectId || '';
    if (!type || !userId) {
        res.json({
            code: -1,
            msg: "type/userId入参缺失"
        });
        return;
    }
    console.log("pushAuditMsg_申请记录数", type, userId, projectId);
    var applyObj = await WxDbHelper.getApplyAuditList();
    if (!applyObj[0]) {
        console.error("未获取可以推送的管理人员或未绑定公众号", userId, JSON.stringify(params));
        res.json({
            code: -1,
            msg: "未获取可以推送的管理人员或未绑定公众号:" + JSON.stringify(appIds)
        });
        return;
    }
    res.json({
        code: 0,
        msg: `即将推送${applyObj.length} 条模板消息。类型${type}`
    });
    console.log("applyObj", JSON.stringify(applyObj));
    for (let n of applyObj) {
        n.usp_id = UUID.v4()
        n.userId = userId;
        n.projectId = projectId;
        n.pushType = type;
        switch (type) {
            case 21://提醒用人单位初审人员
                Mpush.pushAudit(n.usr_openid, n);
                break;
        }
    }
});

//推送用户消息模板（用于提醒通知等内容下发）
router.post("/pushNotice", async (req, res) => {
    var params = req.body;
    // console.log("pushNotice_params", JSON.stringify(params));
    var userId = params.userId;//操作人ID
    var type = params.type;//1笔试2面试  15 考试成绩提醒 16 考试通知
    var projectId = params.projectId || '';
    var openId = params.openId;
    var prjId = params.prjId;
    var appIds = params.appIds;//申请记录ID数组
    var title = params.title;
    var remark = params.remark;
    if ((!appIds && !prjId) || !userId) {
        res.json({
            code: -1,
            msg: "appIds/prjId/userId入参缺失"
        });
        return;
    }
    if (prjId && !openId) {
        res.json({
            code: -1,
            msg: "openId入参缺失"
        });
        return;
    }
    console.log("pushNotice_params", type, title, userId, prjId, openId, (appIds || []).length);
    var pushKey;
    if (openId) {
        pushKey = "pushNotice_" + UUID.v1().replace(/-/g, "");
        redisCache.saveDataTime(pushKey, {
            openId: openId,
            prjId: prjId
        }, 3600);
    }
    var applyObj;
    if (prjId) {
        applyObj = await WxDbHelper.getPrjDetail(prjId);
        applyObj = [applyObj];
    } else {
        if (type == 16) {
            applyObj = await WxDbHelper.getApplyPushList(appIds);
            if (!applyObj[0]) {
                console.error("未获取可以推送的报名信息或用户未绑定公众号", userId, JSON.stringify(params));
                res.json({
                    code: -1,
                    msg: "未获取可以推送的报名信息或用户未绑定公众号:" + JSON.stringify(appIds)
                });
                return;
            }
        } else {
            applyObj = await WxDbHelper.getScoreList(appIds);
        }
    }
    if (!applyObj || !applyObj.length) {
        console.error("未获取可以推送的管理人员或未绑定公众号", userId, JSON.stringify(params));
        res.json({
            code: -1,
            msg: "未获取可以推送的管理人员或未绑定公众号:" + JSON.stringify(appIds)
        });
        return;
    }
    res.json({
        code: 0,
        msg: `即将推送${applyObj.length} 条模板消息。`
    });

    function doPush(n) {
        n.usp_id = UUID.v4()
        n.title = title;
        n.remark = remark;
        n.userId = userId;
        n.pushType = type;
        n.projectId = prjId || n.app_pro_id;
        if (prjId) {
            n.id = pushKey || n.pro_id;
            n.time = n.pro_exam_time;
            n.addr = "";
        } else {
            n.id = n.sco_id;
            n.addr = n.sco_exam_address;
            n.time = n.examStartTime;//笔试-默认
        }
        if (type == 2) {//面试
            if (!prjId) {
                n.time = n.sco_interview_time1;
                n.addr = n.sco_interview_address;
                if (n.addr) {
                    n.time = `${n.time}（${n.addr}）`;
                }
            }
            Mpush.pushInterviewNotice(openId || n.usr_openid, n);
        } else if (type == 15 || type == 19) {//考试成绩提醒
            Mpush.pushScoreTip(openId || n.usr_openid, n);
        } else if (type == 16) {    //提供考生 进行确认参加笔试操作
            Mpush.pushExamNotice(openId || n.usr_openid, n);
        } else {//笔试-默认
            Mpush.pushApplyNotice(openId || n.usr_openid, n);
        }
    }

    function asyncReq(applyList) {
        return new Promise(async function (resolve) {
            setTimeout(async function () {
                for (let n of applyList) {
                    doPush(n)
                    resolve(n.usr_openid);
                }
            }, 3000);
        });
    }
    //分批请求 batchNum 分批间隔数
    const batchNum = 500
    if (applyObj.length > batchNum) {
        for (let i = 0; i < applyObj.length; i += batchNum) {
            await asyncReq(applyObj.slice(i, i + batchNum))
        }
    } else {
        for (let n of applyObj) {
            doPush(n)
        }
    }
});

//缓存数据读取
async function getRedisData(k) {
    var obj = await redisCache.getDataOnly(k);
    try {
        obj = JSON.parse(obj);
    } catch (e) {
    }
    if (!obj) {
        //兼容jwtToken
        obj = await getJWTTokenData(k);
    }
    return obj;
}

async function getJWTTokenData(token) {
    return jwt.verify(token, secretOrPrivateKey, async (err, decode) => {
        if (err) { //  时间失效的时候/ 伪造的token
            return "";
        } else {
            return decode;
        }
    });
}

//绑定用户界面
router.get("/bindUser", async (req, res) => {
    var params = req.query;
    var k = params.k;
    var obj = await getRedisData(k);
    if (!obj) {
        res.render('error', {
            message: "链接已失效",
            error: {
                status: 500,
                stack: "链接已失效，请重新扫码"
            }
        });
        return;
    }
    var idCard = obj.idCard;
    if (idCard.indexOf('SR_') != -1) {
        idCard = idCard.replace('SR_', '')
    }
    var userObj = await WxDbHelper.getUserByIdCard(idCard);
    if (!userObj) {
        res.render('error', {
            message: `当前证件号【${idCard}】未在平台注册，请先到平台注册后再进行微信绑定`,
            error: {
                status: 500,
                stack: "获取绑定用户失败，请重新扫码"
            }
        });
        return;
    }
    var hideIdCard = idCard.substring(0, 4) + "****" + idCard.substring(idCard.length - 3, idCard.length);
    var type = params.type || 1;
    if (userObj.usr_openid) {
        type = 3;
    }
    res.render('bangding', {
        type: type || 1,
        k: k,
        hideIdCard: hideIdCard,
        name: (userObj || {}).usr_name,
        siteWebName
    });
});

//绑定确认
router.post("/toBind", async (req, res) => {
    var params = req.body;
    var k = params.k;
    var obj = await getRedisData(k);
    await WxDbHelper.changeUserOpenId(obj.idCard, obj.openId);
    res.render('bangding', {
        type: 2,
        k: k,
    });
});

//解绑确认
router.post("/unBind", async (req, res) => {
    var params = req.body;
    var k = params.k;
    var obj = await getRedisData(k);
    var idCard = obj.idCard;
    await WxDbHelper.changeUserOpenId(idCard);
    var hideIdCard = idCard.substring(0, 4) + "****" + idCard.substring(idCard.length - 3, idCard.length);
    var userObj = await WxDbHelper.getUserByIdCard(idCard);
    console.log(123);
    res.render('bangding', {
        type: 4,
        k: k,
        hideIdCard: hideIdCard,
        name: (userObj || {}).usr_name,
    });
});

//报名信息详情界面
var statusObjs = {
    app_status_show: {//条件审核（考生端显示） 1待审核 2审核通过 3申述待审核 4申述审核通过 -2资料不符合-3条件不符合 -4申述审核不通过 -5考生要求放弃
        "1": {
            icon: "mind",
            txt: "报名成功，待审核",
            txtColor: "primaryColor"
        },
        "2": {
            icon: "success",
            txt: "报名成功，审核通过",
            txtColor: "successColor"
        },
        "3": {
            icon: "mind",
            txt: "报名成功，申述待审核",
            txtColor: "primaryColor"
        },
        "4": {
            icon: "success",
            txt: "报名成功，申述审核通过",
            txtColor: "successColor"
        },
        "-2": {
            icon: "mind",
            txt: "报名未通过，资料不符合",
            txtColor: "dangerColor"
        },
        "-3": {
            icon: "mind",
            txt: "报名未通过，条件不符合",
            txtColor: "dangerColor"
        },
        "-4": {
            icon: "mind",
            txt: "报名未通过，申述审核不通过",
            txtColor: "dangerColor"
        },
        "-5": {
            icon: "mind",
            txt: "报名未通过，考生要求放弃",
            txtColor: "warningColor"
        }
    },
    app_status: {//条件审核否审核通过 1待审核 2审核通过 3申述待审核 4申述审核通过 -2资料不符合-3条件不符合 -4申述审核不通过 -5考生要求放弃
        "1": {
            icon: "mind",
            txt: "报名成功，待审核",
            txtColor: "primaryColor"
        },
        "2": {
            icon: "success",
            txt: "报名成功，审核通过",
            txtColor: "successColor"
        },
        "3": {
            icon: "mind",
            txt: "报名成功，申述待审核",
            txtColor: "primaryColor"
        },
        "4": {
            icon: "success",
            txt: "报名成功，申述审核通过",
            txtColor: "successColor"
        },
        "-2": {
            icon: "mind",
            txt: "报名未通过，资料不符合",
            txtColor: "dangerColor"
        },
        "-3": {
            icon: "mind",
            txt: "报名未通过，条件不符合",
            txtColor: "dangerColor"
        },
        "-4": {
            icon: "mind",
            txt: "报名未通过，申述审核不通过",
            txtColor: "dangerColor"
        },
        "-5": {
            icon: "mind",
            txt: "报名未通过，考生要求放弃",
            txtColor: "warningColor"
        }
    },
    app_status_picture: {//照片是否审核通过 1审核通过 2待复审 -1审核不通过
        "1": {
            icon: "success",
            txt: "照片审核通过",
            txtColor: "successColor"
        },
        "2": {
            icon: "mind",
            txt: "照片待复审",
            txtColor: "primaryColor"
        },
        "-1": {
            icon: "mind",
            txt: "照片审核不通过",
            txtColor: "dangerColor"
        }
    },
    app_status_check: {//资格复审 1审核通过 -1审核不通过
        "1": {
            icon: "success",
            txt: "资格审核通过",
            txtColor: "successColor"
        },
        "-1": {
            icon: "mind",
            txt: "资格审核不通过",
            txtColor: "dangerColor"
        }
    }
};

router.get("/applyInfo/:id", async (req, res) => {
    var applyId = req.params.id || '';
    if (!applyId) {
        res.render('error', {
            message: "参数错误",
            error: {
                status: 500,
                stack: "参数错误"
            }
        });
        return;
    }
    var obj = await WxDbHelper.getApplyInfoById(applyId);
    var retObj = obj[0];
    if (!retObj) {
        res.render('error', {
            message: "数据获取错误",
            error: {
                status: 500,
                stack: "数据获取错误"
            }
        });
        return;
    }
    retObj.app_status_show_obj = statusObjs["app_status_show"][retObj.app_status_show];
    retObj.app_status_obj = statusObjs["app_status"][retObj.app_status];
    retObj.app_status_picture_obj = statusObjs["app_status_picture"][retObj.app_status_picture];
    retObj.app_status_check_obj = statusObjs["app_status_check"][retObj.app_status_check];
    if (retObj.app_status_show == 1) {
        retObj.app_audit_remark = '';
    }
    res.render('auditResult', {
        obj: retObj,
        siteWebUrl
    });
});

//准考证
router.get("/notice/:id", async (req, res) => {
    var id = req.params.id || '';
    if (!id) {
        res.render('error', {
            message: "参数错误",
            error: {
                status: 500,
                stack: "参数错误"
            }
        });
        return;
    }
    if (id.indexOf("pushNotice_") != -1) {//按方案跟openid推送
        var keyVal = await getRedisData(id);
        var prjId = keyVal.prjId;
        var openId = keyVal.openId;
        var userObj = await WxDbHelper.getUserByOpenId(openId);
        if (!userObj) {
            res.render('error', {
                message: "数据获取错误",
                error: {
                    status: 500,
                    stack: "数据获取错误"
                }
            });
            return;
        }
        obj = await WxDbHelper.getPrjDetail(prjId);//考试方案
        if (!obj) {
            res.render('error', {
                message: "数据获取错误",
                error: {
                    status: 500,
                    stack: "数据获取错误"
                }
            });
            return;
        }
        var idCard = userObj.idCard;
        var hideIdCard = idCard.substring(0, 4) + "****" + idCard.substring(idCard.length - 3, idCard.length);
        res.render('admissionTicket', {
            userImg: userObj.usr_picture ? (picHost + userObj.usr_picture) : "",
            name: userObj.usr_name,
            idCardHidden: hideIdCard,
            examNum: "",
            classroom: "",
            seatNo: "",
            interviewTime: "",
            interviewAddress: "",
            examStartTime: obj.pro_exam_time,
            examAddress: "",
            examination: "",
            prjName: obj.pro_title,
            deptName: "",
            postName: "",
            remark: "",
        });
        return;
    }
    //按考试成绩记录推送
    var obj = await WxDbHelper.getScoreList([id]);//考试成绩
    obj = obj[0];
    if (!obj) {
        res.render('error', {
            message: "数据获取错误",
            error: {
                status: 500,
                stack: "数据获取错误"
            }
        });
        return;
    }
    var idCard = obj.sco_id_card;
    var hideIdCard = idCard.substring(0, 4) + "****" + idCard.substring(idCard.length - 3, idCard.length);
    // console.log("scoObj", JSON.stringify(obj));
    res.render('admissionTicket', {
        userImg: obj.usr_picture ? (picHost + obj.usr_picture) : "",
        name: obj.sco_name,
        idCardHidden: hideIdCard,
        examNum: obj.sco_exam_num || "",
        classroom: obj.sco_classroom || "",
        seatNo: obj.sco_seat_no || "",
        interviewTime: obj.sco_interview_time1 || "",
        interviewAddress: obj.sco_interview_address || "",
        examStartTime: obj.sco_exam_start_time1 || "",
        examEndTime: obj.sco_exam_end_time1 || "",
        examAddress: obj.sco_exam_address || "",
        examination: obj.sco_examination || "",
        prjName: obj.pro_title,
        deptName: obj.sco_dept_name || "",
        postName: obj.sco_post_name || "",
        remark: obj.sco_remark || "",
    });
});

//招聘动态
router.get("/SZ", async (req, res) => {
    var host = 'http://ksbm.fjrst.cn:8903';
    if (req.headers.host.indexOf("ksbmmp.fjrst.cn") == -1) {
        host = 'https://ksbmtest.zypxcs.com:8904';
    }
    var params = req.query;
    var minYear = 2021;
    var maxYear = new Date().getFullYear() + 1;
    var keyword = params.keyword;//过滤关键字
    var areaCode = params.areaCode;//当前选中区域
    var year = params.year;//当前选中年度
    var areas = [{
        label: "所属地区",
        value: ""
    }];//可选地区
    var areaName = "所属地区";
    for (let k in global.areaCodeToName || []) {
        var n = global.areaCodeToName[k];
        var c = n.code;
        if (+c.substring(4, 6)) continue;
        areas.push({
            label: n.name,
            value: n.code
        });
        if (n.code == areaCode) {
            areaName = n.name;
        }
    }
    var years = [{
        label: "发布年度",
        value: ""
    }];//可选年度
    for (let y = minYear; y < maxYear; y++) {
        years.push({
            label: y,
            value: y
        });
    }

    var datas = await WxDbHelper.getSZPrj(keyword, year, areaCode);
    var backList = [];
    _.each(datas, (n) => {
        var noticeTime = n.noticeTime;
        backList.push({
            title: n.title,
            detailUrl: n.url || `${host}/article/detail/${n.newId}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy-MM-dd"),
            areaCode: n.areaCode,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    res.render('SZ', {
        keyword: keyword,//过滤关键字
        areaCode: areaCode,//当前选中区域
        areaName: areaName,
        year: year,//当前选中年度
        areas: areas,//可选地区
        years: years,//可选年度
        datas: backList,
    });
});

//招聘资讯
router.get("/ZX", async (req, res) => {
    // var host = 'http://ksbm.fjrst.cn:8903';
    // if (req.headers.host.indexOf("ksbmmp.fjrst.cn") == -1) {
    //     host = 'https://ksbmtest.zypxcs.com:8904';
    // }
    var host = 'https://ksbmmp.fjrst.cn'
    var params = req.query;
    var minYear = 2021;
    var maxYear = new Date().getFullYear() + 1;
    var keyword = params.keyword;//过滤关键字
    var areaCode = params.areaCode;//当前选中区域
    var year = params.year;//当前选中年度
    var areas = [{
        label: "所属地区",
        value: ""
    }];//可选地区
    var areaName = "所属地区";
    for (let k in global.areaCodeToName || []) {
        var n = global.areaCodeToName[k];
        var c = n.code;
        if (+c.substring(4, 6)) continue;
        areas.push({
            label: n.name,
            value: n.code
        });
        if (n.code == areaCode) {
            areaName = n.name;
        }
    }
    var years = [{
        label: "发布年度",
        value: ""
    }];//可选年度
    for (let y = minYear; y < maxYear; y++) {
        years.push({
            label: y,
            value: y
        });
    }
    var datas = await getRedisData("getSZPrjNew3" + keyword + year + areaCode);
    // console.log(datas, 'datas------ 缓存');
    if (!datas) {
        datas = await WxDbHelper.getSZPrj(keyword, year, areaCode);
        // console.log(datas, 'datas------');
        redisCache.saveDataTime("getSZPrjNew3" + keyword + year + areaCode, datas, 6000);
    }
    var datas2 = await getRedisData("getSZPrj2New3" + keyword + year + areaCode);
    // console.log(datas2, 'datas2------ 缓存');
    if (!datas2) {
        datas2 = await WxDbHelper.getSZPrj2(keyword, year, areaCode);
        // console.log(datas2, 'datas2------');
        redisCache.saveDataTime("getSZPrj2New3" + keyword + year + areaCode, datas2, 6000);
    }

    var datas3 = await getRedisData("getSZPrj3New3" + keyword + year + areaCode);
    // console.log(datas3, 'datas3------ 缓存');
    if (!datas3) {
        datas3 = await WxDbHelper.getSZPrj3(keyword, year, areaCode);
        // console.log(datas3, 'datas3------');
        redisCache.saveDataTime("getSZPrj3New3" + keyword + year + areaCode, datas3, 6000);
    }
    // console.log(datas[0],'datas');
    // console.log(datas2.length,'datas2');
    // console.log(datas3.length,'datas3');
    var backList = [];
    _.each(datas, (n) => {
        var noticeTime = n.noticeTime;
        backList.push({
            title: n.title,
            detailUrl: n.url || `${host}/mp3/ZDE?newId=${n.newId}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy/MM/dd"),
            areaCode: n.areaCode,
            proTitle: n.proTitle,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    var backList2 = [];
    _.each(datas2, (n) => {
        var noticeTime = n.new_pub_date;
        backList2.push({
            title: n.new_title,
            detailUrl: n.new_url || `${host}/mp3/ZDE?newId=${n.new_id}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy/MM/dd"),
            areaCode: n.areaCode,
            proTitle: n.pro_title,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    var backList3 = [];
    _.each(datas3, (n) => {
        var noticeTime = n.new_pub_date;
        backList3.push({
            title: n.new_title,
            detailUrl: n.new_url || `${host}/mp3/ZDE?newId=${n.new_id}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy/MM/dd"),
            areaCode: n.areaCode,
            proTitle: n.pro_title,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    res.render('ZX', {
        keyword: keyword,//过滤关键字
        areaCode: areaCode,//当前选中区域
        areaName: areaName,
        year: year,//当前选中年度
        areas: areas,//可选地区
        years: years,//可选年度
        datas: backList,
        datas2: backList2,
        datas3: backList3,
    });
});

//招聘资讯搜索
router.get("/ZXS", async (req, res) => {
    // var host = 'http://ksbm.fjrst.cn:8903';
    // if (req.headers.host.indexOf("ksbmmp.fjrst.cn") == -1) {
    //     host = 'https://ksbmtest.zypxcs.com:8904';
    // }
    var host = 'https://ksbmmp.fjrst.cn'
    var params = req.query;
    var minYear = 2021;
    var maxYear = new Date().getFullYear() + 1;
    var keyword = params.keyword;//过滤关键字
    var areaCode = params.areaCode;//当前选中区域
    var year = params.year;//当前选中年度
    var areas = [{
        label: "所属地区",
        value: ""
    }];//可选地区
    var areaName = "所属地区";
    for (let k in global.areaCodeToName || []) {
        var n = global.areaCodeToName[k];
        var c = n.code;
        if (+c.substring(4, 6)) continue;
        areas.push({
            label: n.name,
            value: n.code
        });
        if (n.code == areaCode) {
            areaName = n.name;
        }
    }
    var years = [{
        label: "发布年度",
        value: ""
    }];//可选年度
    for (let y = minYear; y < maxYear; y++) {
        years.push({
            label: y,
            value: y
        });
    }
    var datas = await WxDbHelper.getSZPrj(keyword, year, areaCode);
    var datas2 = await WxDbHelper.getSZPrj2(keyword, year, areaCode);
    var datas3 = await WxDbHelper.getSZPrj3(keyword, year, areaCode);
    var backList = [];
    _.each(datas, (n) => {
        var noticeTime = n.noticeTime;
        backList.push({
            title: n.title,
            detailUrl: n.url || `${host}/mp3/ZDE?newId=${n.newId}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy/MM/dd"),
            areaCode: n.areaCode,
            proTitle: n.proTitle,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    var backList2 = [];
    _.each(datas2, (n) => {
        var noticeTime = n.new_pub_date;
        backList2.push({
            title: n.new_title,
            detailUrl: n.new_url || `${host}/mp3/ZDE?newId=${n.new_id}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy/MM/dd"),
            areaCode: n.areaCode,
            proTitle: n.pro_title,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    var backList3 = [];
    _.each(datas3, (n) => {
        var noticeTime = n.new_pub_date;
        backList3.push({
            title: n.new_title,
            detailUrl: n.new_url || `${host}/mp3/ZDE?newId=${n.new_id}`,
            noticeTime: WxDbHelper.changeDate(noticeTime, "yyyy/MM/dd"),
            areaCode: n.areaCode,
            proTitle: n.pro_title,
            areaName: (areaCodeToName[n.areaCode] || {}).name || "",
        });
    });
    res.render('ZXS', {
        keyword: keyword,//过滤关键字
        areaCode: areaCode,//当前选中区域
        areaName: areaName,
        year: year,//当前选中年度
        areas: areas,//可选地区
        years: years,//可选年度
        datas: backList,
        datas2: backList2,
        datas3: backList3,
    });
});
router.get("/ZDE", async (req, res) => {
    var params = req.query;
    var newId = params.newId;
    // console.log(params,'params');
    var data = await WxDbHelper.getSZSingle(newId)
    data = data[0]
    if (data.new_type == 2) {
        data.title = '招聘动态详情页'
    } else if (data.new_type == 3) {
        data.title = '招聘公示详情页'
    } else if (data.new_type == 7) {
        data.title = '招聘通知详情页'
    }
    data.new_pub_date = WxDbHelper.changeDate(data.new_pub_date, "yyyy-MM-dd")
    var pro = await WxDbHelper.getPrjDetail(data.new_project_id)
    if (pro && pro.pro_title) {
        data.proName = pro.pro_title
    }
    data.file = data.new_content_file ? JSON.parse(data.new_content_file) : []
    data.new_content = (data.new_content || '').replace('/ksbm/profile/upload', 'https://gqzp.fjrst.cn/ksbm/profile/upload')
    data.new_content = (data.new_content || '').replace('<img', '<img style="width:100%"')
    data.new_content = (data.new_content || '').replace('<table', '<table style="font-size:8px;border-spacing:0px"')
    data.new_content = (data.new_content || '').replace(/<td/g, `<td style="
    border:solid #676767 1px;
    text-align:center;
    word-break:break-all !important;
    vertical-align:middle !important;
    "`)
    // console.log(data,'data');
    res.render('ZDE', {
        data: data
    });
});


module.exports = router;
