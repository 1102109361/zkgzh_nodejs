var SqlString = require("sqlstring");
var { v4: uuid } = require('uuid');

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
                      date_format(pro.pro_print_time, '%Y-%m-%d %H:%i')       as pro_print_time,
                      date_format(p.pos_exam_time, '%Y-%m-%d %H:%i')          as pro_exam_time,
                      date_format(pro.pro_score_time, '%Y-%m-%d %H:%i')       as pro_score_time,
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
                      date_format(t.updatedAt, '%Y-%m-%d %H:%i')      as updatedAt
               FROM ksbm_apply t,
                    ksbm_user u,
                    ksbm_post p,
                    ksbm_project pro
               WHERE app_id = '${appId}'
                 AND t.app_user_id = u.usr_user_id
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
                      DATE_FORMAT(t.app_apply_time, '%Y-%m-%d %H:%i') as applyTime,
                      t.*
               FROM ksbm_apply t,
                    ksbm_user u,
                    ksbm_post p
               WHERE app_id IN ('${appIds.join("','")}')
                 AND t.app_user_id = u.usr_user_id
                 and p.pos_id = t.app_pos_id
                 AND u.usr_openid IS NOT NULL`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}

//加分审核结果信息获取
async function getReviewPushList1(appIds) {
    var sql = `SELECT
                    usr_openid,
                    sca_audit_status 
                FROM
                    ksbm_score_add s
                INNER join ksbm_apply a on s.sca_app_id = a.app_id
                INNER JOIN ksbm_user u on a.app_user_id = u.usr_user_id
                WHERE
                sca_app_id IN ('${appIds.join("','")}')`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}

//资格复审结果信息获取
async function getReviewPushList2(appIds) {
    var sql = `SELECT
                    usr_openid,
                    sco_recheck_status 
                FROM
                    ksbm_score s
                INNER join ksbm_apply a on s.sco_app_id = a.app_id
                INNER JOIN ksbm_user u on a.app_user_id = u.usr_user_id
                WHERE
                sco_app_id IN ('${appIds.join("','")}')`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}


//报名推送信息获取
async function getApplyAuditList() {
    var sql = `SELECT p.pro_id           AS proId,
                      p.pro_title        AS proTitle,
                      (SELECT GROUP_CONCAT((select usr_openid from ksbm_user where usr_user_id = u.user_id and usr_openid is not null))
                       FROM sys_user u,
                            sys_user_role r
                       where u.user_id = r.user_id
                         and dept_id = p.pro_dept_id
                         AND r.role_id = 11
                         AND u.status = 0
                         AND u.del_flag = 0
                       GROUP BY dept_id) AS openids,
                      p.pro_dept_id,
                      count(*)           AS auditCount
               FROM ksbm_project p,
                    ksbm_apply b,
                    ksbm_post c
               WHERE now() BETWEEN p.pro_apply_start_time
                   and p.pro_apply_end_time
                 AND b.app_pos_id = c.pos_id
                 AND p.pro_id = c.pos_pro_id
                 AND b.app_status IN (1, 3, 5)
                 AND p.is_del = 0
                 AND p.pro_status = 1
                 AND b.is_del = 0
               GROUP BY p.pro_id`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}


//通过身份证号获取用户
async function getUserByIdCard(idCard) {
    var sql = `select *
    from ksbm_user u,sys_user s
    where s.user_name = '${idCard}'
    and u.usr_user_id = s.user_id`;
    var arr = await DbTools.queryAsync(sql);
    var obj = arr[0];
    return obj;
}

//通过openid获取用户信息
async function getUserByOpenId(openId) {
    var sql = `select 
    u.*,
    s.user_name as idCard
    from ksbm_user u,sys_user s
    where usr_openid =  '${openId}'
    and s.user_id = u.usr_user_id`;
    var arr = await DbTools.queryAsync(sql);
    var obj = arr[0];
    return obj;
}


//通过userid获取用户信息
async function getUserByUserIds(userIds) {
    var sql = `select *
               from ksbm_user
               where usr_user_id in ('${userIds.join("','")}')`;
    var arr = await DbTools.queryAsync(sql);
    return arr;
}

//绑定用户openid
async function changeUserOpenId(idCard, openId) {
    var sql = `update ksbm_user u,sys_user s
    set usr_openid='${openId}'
    where s.user_name = '${idCard}'
		and u.usr_user_id = s.user_id`;
    if (!openId) {
        var sql = `update ksbm_user u,sys_user s
				set usr_openid=null
				where s.user_name = '${idCard}'
				and u.usr_user_id = s.user_id`;
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
    if (!sqlData.usp_id) {
        sqlData.usp_id = uuid();
    }
    var sql = SqlString.format("INSERT INTO ksbm_user_push set ?", sqlData);
    await DbTools.queryAsync(sql);
    return;
}
//重新推送更新推送日志
async function updatePushLog(obj) {
    console.log(obj, 'obj');
    if (!obj) {
        return;
    }
    var sql = SqlString.format("update ksbm_user_push set usp_status=?,usp_result=? where usp_id=?", [obj.usp_status, obj.usp_result, obj.usp_id]);
    // var sql = `update ksbm_user_push set usp_status='${obj.usp_status}' and usp_result='${obj.usp_result}' where usp_id='${obj.usp_id}'`;
    console.log(sql, 'sql');
    await DbTools.queryAsync(sql);
    return;
}
//获取考场安排
async function getScoreList(ids) {
    var sql = `select ks.*,
    date_format(ks.sco_exam_start_time, '%Y-%m-%d %H:%i')                  as sco_exam_start_time1,
       date_format(ks.sco_exam_end_time, '%H:%i')                             as sco_exam_end_time1,
       ks.sco_interview_time                                                  as sco_interview_time,
       ks.sco_pro_id                                                          as app_pro_id,
       (select pro_exam_time from ksbm_project where pro_id = ks.sco_pro_id)  as pro_exam_time1,
       (select pro_title from ksbm_project where pro_id = ks.sco_pro_id)      as pro_title,
       ( select usr_openid FROM ksbm_apply a,ksbm_user u where app_user_id = u.usr_user_id and a.app_id = ks.sco_app_id)  as usr_openid,
       ( select usr_picture FROM ksbm_apply a,ksbm_user u where app_user_id = u.usr_user_id and a.app_id = ks.sco_app_id) as usr_picture,
       date_format(ks.sco_exam_start_time,'%Y-%m-%d %H:%i') as examStartTime
       
from ksbm_score ks
where ks.sco_id in ('${ids.join("','")}');`;
    var list = await DbTools.queryAsync(sql);
    return list;
}

async function getScoreById(scoId) {
    var sql = `select 
                    ks.*,
                    date_format(ks.sco_exam_start_time, '%Y-%m-%d %H:%i')                  as sco_exam_start_time1,
                    date_format(ks.sco_exam_end_time, '%H:%i')                             as sco_exam_end_time1,
                    date_format(ks.sco_interview_time, '%Y-%m-%d %H:%i')                   as sco_interview_time1,
                    (select pro_exam_time from ksbm_project where pro_id = ks.sco_pro_id)  as pro_exam_time1,
                    (select pro_title from ksbm_project where pro_id = ks.sco_pro_id)      as pro_title,
                    (select usr_openid from ksbm_user where usr_id_card = ks.sco_id_card)  as usr_openid,
                    (select usr_picture from ksbm_user where usr_id_card = ks.sco_id_card) as usr_picture
               from ksbm_score ks
               where sco_id = '${scoId}'`;
    var arr = await DbTools.queryAsync(sql);
    var obj = arr[0];
    return obj;
}

//获取方案信息
async function getPrjDetail(id) {
    var sql = `select 
                p.*,
                date_format(pro_exam_time, '%Y-%m-%d %H:%i') as pro_exam_time
               from ksbm_project p
               where pro_id = '${id}'`;
    var list = await DbTools.queryAsync(sql);
    return list[0];
}

//招聘资讯获取
async function getSZPrj(keyword, areaCode, year, page) {
    var sql = `
    SELECT * FROM
    ( SELECT
    null as newId,
    p.pro_scheme_name AS title,
    p.pro_scheme_url AS url,
    p.pro_pubdate AS noticeTime,
    '1' AS type,
    '1' AS 'status',
    '1' as kind,
    d.dep_area_code AS areaCode,
    p.pro_id AS projectId,
    p.pro_title AS proTitle
    FROM ksbm_project p
    LEFT JOIN ksbm_dept d ON p.pro_dept_id = d.dep_id
    WHERE p.is_del = 0
    AND p.pro_status = 1
        UNION ALL
        SELECT
        t.new_id as newId,
        t.new_title AS title,
        t.new_url AS url,
        t.new_pub_date AS noticeTime,
        '2' AS 'status',
        '2' AS type,
        t.new_kind AS kind,
        d.dep_area_code AS areaCode,
        p.pro_id AS projectId,
        p.pro_title AS proTitle
        FROM ksbm_news t
        LEFT JOIN ksbm_project p ON t.new_project_id = p.pro_id
        LEFT JOIN ksbm_dept d ON p.pro_dept_id = d.dep_id
        WHERE new_status = 4
        AND new_type = 2
        and new_pub_date<date_format(NOW(), '%Y-%m-%d %H:%i:%S') 
        ) a
    where status > 0
    ${keyword ? `AND (title LIKE concat( '%','${keyword}','%') or  proTitle like concat('%','${keyword}','%') ) ` : ''}
    ${areaCode ? ` AND left(a.areaCode,6) = ${areaCode}` : ''}
    ${year ? `and year(a.noticeTime) = ${year}` : ''}
    ORDER BY a.noticeTime DESC
    `;
    var list = await DbTools.queryAsync(sql);
    return list;
}

//招聘公示获取
async function getSZPrj2(keyword, areaCode, year) {
    var sql = `
    select t.new_id, t.new_project_id, t.new_type, t.new_title, t.new_url, t.new_summary, t.new_num, t.new_notice_time,
               t.new_expira_date, t.new_kind, t.new_content, t.new_content_file, t.new_status, t.new_source, t.new_change_log,
               t.dept_id, t.new_dept_name, t.user_id, t.new_pub_date, t.is_del, t.createdAt, t.updatedAt,
               u.nick_name,
               p.pro_title,
               '' as suffix_ from ksbm_news t
            Left join sys_user u on t.user_id = u.user_id
            LEFT JOIN ksbm_project p ON t.new_project_id = p.pro_id
            LEFT JOIN ksbm_dept d ON p.pro_dept_id = d.dep_id
        where
            t.is_del = 1
            and new_type in (2,3,7)
            and new_status = 4
            and t.new_type = 3
            and new_pub_date<date_format(NOW(), '%Y-%m-%d %H:%i:%S') 
    ${keyword ? `AND (new_title LIKE concat( '%','${keyword}','%') or p.pro_title like concat('%','${keyword}','%') ) ` : ''}    

    ${areaCode ? ` AND left(a.areaCode,6) = ${areaCode}` : ''}

    ${year ? `and year(new_pub_date) = ${year}` : ''}
    
        order by t.new_pub_date desc
    

    `;
    var list = await DbTools.queryAsync(sql);
    return list;
}

//招聘通知获取
async function getSZPrj3(keyword, areaCode, year) {
    var sql = `
    select t.new_id, t.new_project_id, t.new_type, t.new_title, t.new_url, t.new_summary, t.new_num, t.new_notice_time,
               t.new_expira_date, t.new_kind, t.new_content, t.new_content_file, t.new_status, t.new_source, t.new_change_log,
               t.dept_id, t.new_dept_name, t.user_id, t.new_pub_date, t.is_del, t.createdAt, t.updatedAt,
               u.nick_name,
               p.pro_title,
               '' as suffix_ from ksbm_news t
            Left join sys_user u on t.user_id = u.user_id
            LEFT JOIN ksbm_project p ON t.new_project_id = p.pro_id
            LEFT JOIN ksbm_dept d ON p.pro_dept_id = d.dep_id
        where
            t.is_del = 1
            and new_type in (2,3,7)
            and new_status = 4
            and t.new_type = 7
            and new_pub_date<date_format(NOW(), '%Y-%m-%d %H:%i:%S') 
        ${keyword ? `AND (new_title LIKE concat( '%','${keyword}','%') or p.pro_title like concat('%','${keyword}','%') ) ` : ''}    

    ${areaCode ? ` AND left(a.areaCode,6) = ${areaCode}` : ''}

    ${year ? `and year(new_pub_date) = ${year}` : ''}
    
        order by t.new_pub_date desc
    
    `;
    var list = await DbTools.queryAsync(sql);
    return list;
}

//资讯单条记录
async function getSZSingle(newId) {
    var sql = `
    SELECT * FROM ksbm_news where  new_id='${newId}' limit 0,1
    `;
    var list = await DbTools.queryAsync(sql);
    return list;
}

//通过userid获取用户信息
async function getWrongPush(time, sql) {
    if (sql) {
        var doSql = sql
    } else if (time) {
        var doSql = `select * from ksbm_user_push where createdAt > '${time}' and usp_status != 1 ;`;
    } else {
        console.log(changeDate(new Date(), 'yyyy-MM-dd'));
        var doSql = `select * from ksbm_user_push where createdAt > '${changeDate(new Date(), 'yyyy-MM-dd')}' and usp_status != 1 ;`;
    }
    var arr = await DbTools.queryAsync(doSql);
    return arr;
}

module.exports = {
    updateWxUserInfoUnionidMySql,
    getUserByIdCard,
    getUserByOpenId,
    getUserByUserIds,
    changeUserOpenId,
    addPushLog,
    getApplyPushList,
    getApplyList,
    getScoreById,
    getApplyAuditList,
    getApplyInfoById,
    getScoreList,
    getPrjDetail,
    getSZPrj,
    getSZPrj2,
    getSZPrj3,
    getSZSingle,
    changeDate,
    getReviewPushList1,
    getReviewPushList2,
    getWrongPush,
    updatePushLog
}
