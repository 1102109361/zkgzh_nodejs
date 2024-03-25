//防疫设备需要的数据库交互接口
var SqlString = require("sqlstring");
var {v4: uuid} = require('uuid');

function changeDate(time, dateType) {
    time = new Date(time);
    var y = time.getFullYear();
    var M = time.getMonth() + 1;
    var d = time.getDate();
    var h = time.getHours();
    var m = time.getMinutes();
    var s = time.getSeconds();
    M = M < 10 ? ("0" + M) : M;
    d = d < 10 ? ("0" + d) : d;
    h = h < 10 ? ("0" + h) : h;
    m = m < 10 ? ("0" + m) : m;
    s = s < 10 ? ("0" + s) : s;
    dateType = dateType.replace("yyyy", y);
    dateType = dateType.replace("MM", M);
    dateType = dateType.replace("dd", d);
    dateType = dateType.replace("hh", h);
    dateType = dateType.replace("mm", m);
    dateType = dateType.replace("ss", s);
    return dateType;
}

async function updateWxUserInfoUnionidMySql(appid, userInfo) {
    if (appid && userInfo && userInfo.unionid) {
        var openid = userInfo.openid || '';
        var dataObj = {
            wur_id: uuid(),
            wur_appid: appid,
            wur_openid: openid,
            wur_remark: userInfo.nickname || userInfo.remark, // 2021年12月27日之后，不再输出头像、昵称信息。
            wur_unionid: userInfo.unionid,
            wur_subscribe_last: userInfo.subscribe_time ? new Date(userInfo.subscribe_time * 1000) : new Date(),
            wur_is_subscribe: userInfo.subscribe,
            wur_subscribe_scene: userInfo.subscribe_scene || ''
        };
        if (userInfo.subscribe == 1) {
            dataObj.wur_info = JSON.stringify(userInfo);
        }
        var sql_old = `select wur_id
                       from ksbm_weixin_user t
                       where t.wur_appid = '${appid}'
                         and t.wur_unionid = '${userInfo.unionid}'`
        var sql = SqlString.format("INSERT INTO ksbm_weixin_user SET ?", dataObj);
        var oldObj = await DbTools.queryAsync(sql_old);
        if (oldObj.length) {//有旧数据
            dataObj.wur_id = oldObj[0].wur_id;
            sql = SqlString.format("update ksbm_weixin_user SET ? where wur_id=?", [dataObj, dataObj.wur_id]);
        }
        var i = 0;
        try {
            await DbTools.queryAsync(sql);
            i++;
        } catch (e) {
            console.error('updateWxUserInfoUnionidMySql插入通行记录失败：', i, sql, e);
        }

    } else {
        console.error("updateWxUserInfoUnionidMySql更新数据mysql异常：", appid, JSON.stringify(userInfo));
    }
}

//报名信息获取
async function getApplyList(appIds) {
    var sql = `select *
               from ksbm_apply
               where app_id in ('${appIds.join("','")}')`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}

//报名信息详情
async function getApplyInfoById(appId) {
    var sql = `SELECT u.usr_openid,
                      pro.pro_title,
                      date_format(pro.pro_apply_start_time, '%Y-%m-%d %H:%i') as pro_apply_start_time,
                      date_format(pro.pro_apply_end_time, '%Y-%m-%d %H:%i')   as pro_apply_end_time,
                      p.pos_dept_name,
                      p.pos_post_name,
                      date_format(p.pos_appeal_end_time, '%Y-%m-%d %H:%i')    as pos_appeal_end_time,
                      date_format(t.app_apply_time, '%Y-%m-%d %H:%i')         as app_apply_time,
                      f_str_replace(t.app_name, 1, 1)                         as app_name,
                      f_str_replace(t.app_id_card, 6, 6)                      as app_id_card,
                      app_status_show,
                      app_status,
                      app_status_picture,
                      app_status_check,
                      app_exam_num,
                      app_audit_remark,
                      date_format(t.updatedAt, '%Y-%m-%d %H:%i')              as updatedAt
               FROM ksbm_apply t,
                    ksbm_user u,
                    ksbm_post p,
                    ksbm_project pro
               WHERE app_id = '${appId}'
                 AND t.app_id_card = u.usr_id_card
                 and p.pos_id = t.app_pos_id
                 and t.app_pro_id = pro.pro_id`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}


//报名推送信息获取
async function getApplyPushList(appIds) {
    var sql = `SELECT u.usr_openid,
                      p.pos_dept_name,
                      p.pos_post_name,
                      p.pos_written_subject,
                      t.*
               FROM ksbm_apply t,
                    ksbm_user u,
                    ksbm_post p
               WHERE app_id IN ('${appIds.join("','")}')
                 AND t.app_id_card = u.usr_id_card
                 and p.pos_id = t.app_pos_id
                 AND u.usr_openid IS NOT NULL`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}

//通过身份证号获取用户
async function getUserByIdCard(idCard) {
    var sql = `select *
               from ksbm_user
               where usr_id_card = '${idCard}'`;
    var arr = await DbTools.queryAsync(sql);
    var obj = arr[0];
    return obj;
}

//通过openid获取用户信息
async function getUserByUserIds(userIds) {
    var sql = `select *
               from ksbm_user
               where usr_user_id in ('${userIds.join("','")}')`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}

//绑定用户openid
async function changeUserOpenId(idCard, openId) {
    var sql = `update ksbm_user
               set usr_openid='${openId}'
               where usr_id_card = '${idCard}'`;
    if (!openId) {
        var sql = `update ksbm_user
                   set usr_openid=null
                   where usr_id_card = '${idCard}'`;
    }
    await DbTools.queryAsync(sql);
    return;
}

//存储推送日志
async function addPushLog(obj) {
    if (!obj) {
        return;
    }
    var sqlData = JSON.parse(JSON.stringify(obj));
    delete sqlData.createdAt;
    delete sqlData.updatedAt;
    sqlData.usp_id = uuid();
    var sql = SqlString.format("INSERT INTO ksbm_user_push set ?", sqlData);
    await DbTools.queryAsync(sql);
    return;
}

//存储通行日志
async function addPassLog(saveObj) {
    saveObj.log_id = uuid();
    var sql = SqlString.format("INSERT INTO ksbm_pass_log set ?", saveObj);
    await DbTools.queryAsync(sql);
    return;
}

//获取通行日志
async function getPassLog(log_msgid, log_dev_sn) {
    var sql = SqlString.format("select * from ksbm_pass_log where log_msgid=? and log_dev_sn=?", [log_msgid, log_dev_sn]);
    var arr = await DbTools.queryAsync(sql);
    return arr[0];
}

//通过方案ID获取考试人员
async function getScoreListPrjId(prjId) {
    /* 
     id: "",
            name: "",
            idCard: "",
            endTime: ""
    */
    var sql = `select 
    ks.sco_id_card as id,
    ks.sco_name as name,
    ks.sco_id_card as idCard,
    date_format(ks.sco_exam_end_time,"%Y-%m-%d 23:59") as endTime
    from ksbm_score ks where ks.sco_pro_id='${prjId}'`;
    var list = await DbTools.queryAsync(sql);
    return list;
}
//获取方案及考场
async function getExamPrjs(examTime) {
    var sql = `
    select
    p.pro_id as prjId,
    p.pro_title as prjName,
    (select a.pos_dept_name from ksbm_post a,ksbm_apply ap where ap.app_pos_id= a.pos_id and ap.app_id= t.sco_app_id) as deptName,
    t.sco_exam_address as examAddress, 
    count(DISTINCT sco_classroom) as classroomNum,
    count(1) as classUserNum,
    GROUP_CONCAT(DISTINCT t.sco_exam_start_time) as examTime
    from ksbm_score t,ksbm_project p where t.sco_exam_num is not null 
    and DATE_FORMAT(t.sco_exam_start_time,'%Y-%m-%d') ='${changeDate(examTime, "yyyy-MM-dd")}'
    and p.pro_id = t.sco_pro_id
    GROUP BY t.sco_pro_id, t.sco_exam_address 
    order by t.sco_pro_id;
    `;
    var list = await DbTools.queryAsync(sql);
    return list;
}
//获取设备列表
async function getDevs(devKind) {
    var sql = `select 
    dev_id as id,
    dev_sn as devNo,
    dev_kind as kind
    from ksbm_device where dev_kind=${devKind}`;
    if (!devKind) {
        sql = `select 
        dev_id as id,
        dev_sn as devNo,
        dev_kind as kind
        from ksbm_device`;
    }
    var list = await DbTools.queryAsync(sql);
    return list;
}

//新增设备
async function addDev(devNo, devName, devKind) {
    var sql = SqlString.format("INSERT INTO ksbm_device set ?", [{
        dev_id: uuid(),
        dev_sn: devNo,
        dev_name: devName,
        dev_kind: devKind
    }]);
    await DbTools.queryAsync(sql);
}

//检查旧设备
async function checkOldDev(devNo, devName, devKind) {
    var sql = `select * from ksbm_device where dev_sn='${devNo}' and dev_kind=${devKind}`;
    var list = await DbTools.queryAsync(sql);
    if (!list[0]) {
        //无设备进行添加
        await addDev(devNo, devName, devKind);
    }
    return;
}

module.exports = {
    addPassLog,
    getPassLog,
    getScoreListPrjId,
    checkOldDev,
    getExamPrjs,
    getDevs
}
