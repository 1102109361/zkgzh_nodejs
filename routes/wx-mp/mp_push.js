//福建招聘平台 公众号推送模板消息
var _ = require('lodash');
var request = require("request");
var redisCache = require('../../leancache/cache');
var WxCommon = require('../../common/wx_common');//微信操作相关的公共方法
var WxDbHelper = require('./wx_db');//微信操作相关的公共方法
var WeixinConfig = JSON.parse(process.env.WXMP_KSBM || '{}');
var mp_appid = WeixinConfig.mp_appid;
var mp_secret = WeixinConfig.mp_secret;
var pushMpDefault = {
    mp_appid: mp_appid,
    mp_secret: mp_secret
};
var miniprogramAppId = 'wx09103ce6a3d17f8d'; // 小程序的appid,用于模板消息打开

var host = process.env.MP_PAGE_HOST;
const wxapi = require('../../work/wxapi')

//10 笔试考试安排
async function pushApplyNotice(openid, params) {
    var url = host + "/mp/notice/" + params.id;
    if (params.sco_post_name) {
        params.sco_post_name = params.sco_post_name.replace(/\(/g, "（").replace(/\)/g, "）");
    }
    var msgData = {
        "template_id": 'tvD-JYCVk-UOAB_-Vq9Ly_J0P2Pw_1LwRY1shcrdi_s',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "keyword1": getKey('笔试考试安排'),
            "keyword2": getKey(params.title || '平台考试提醒通知'), //读取标题
            "keyword3": getKey(params.remark || '请您关注平台动态！'), //通知内容

            // "first": getKey(params.title || '平台考试提醒通知'),
            // "keyword1": getKey(params.sco_post_name || '未知'), //考试名称
            // "keyword2": getKey(params.time), //考试时间
            // "keyword3": getKey(params.addr), //考试地点
            // "remark": getKey(params.remark || '请您关注平台动态！')
        }
    };
    await pushWechat(openid, msgData, params);
}


//10 考试通知  用于提醒考生考试相关的业务操作
async function pushExamNotice(openid, params) {
    var url = host + "/mp/applyInfo/" + (params.app_id || params.sco_id);
    if (params.pos_post_name) {
        params.pos_post_name = params.pos_post_name.replace(/\(/g, "（").replace(/\)/g, "）");
    }
    var msgData = {
        "template_id": 'tvD-JYCVk-UOAB_-Vq9Ly_J0P2Pw_1LwRY1shcrdi_s',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "keyword1": getKey('报名进度通知'),
            "keyword2": getKey(params.title || '平台考试相关提醒'), //标题
            "keyword3": getKey(params.remark || '请您关注平台动态！'), //通知内容
            // "first": getKey(params.title || '平台考试相关提醒'),
            // "keyword1": getKey(params.pos_post_name || '岗位未知'), //报考内容 （方案标题）
            // "keyword2": getKey(params.time ? params.time + "(考试时间)" : params.applyTime), //报考时间  （ 考试时间）
            // "remark": getKey(params.remark || '请您关注平台动态！')
        }
    };
    await pushWechat(openid, msgData, params);
}


//15 考试成绩提醒  用于考生可以查询成绩
async function pushScoreTip(openid, params) {
    var url = host + "/mp/applyInfo/" + params.app_id;
    // var color = '#F56C6C';
    var msgData = {
        "template_id": 'tvD-JYCVk-UOAB_-Vq9Ly_J0P2Pw_1LwRY1shcrdi_s',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "keyword1": getKey(params.pushType == 15 ? '成绩发布通知' : '资格复审通知'),
            "keyword2": getKey(params.title || '您的考试成绩已发布，请登录平台进行查询'), //读取标题
            "keyword3": getKey(params.remark || '请及时登录平台查询！'), //通知内容
            // "first": getKey(params.title || '您的考试成绩已发布，请登录平台进行查询'),
            // "keyword1": getKey(params.app_name || params.sco_name || '暂无'), //报名姓名
            // "keyword2": getKey(params.pos_post_name || params.sco_post_name || '岗位名称未知', color), //考试类型
            // "keyword3": getKey('请登录平台查询'), //及格标志
            // "remark": getKey(params.remark || ('请及时登录平台查询！'), color)
        }
    };
    await pushWechat(openid, msgData, params);
}

//考生面试通知
async function pushInterviewNotice(openid, params) {
    var url = host + "/mp/notice/" + params.id;
    if (params.pro_title) {
        params.pro_title = params.pro_title.replace(/\(/g, "（").replace(/\)/g, "）");
    }
    var msgData = {
        "template_id": 'tvD-JYCVk-UOAB_-Vq9Ly_J0P2Pw_1LwRY1shcrdi_s',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "keyword1": getKey('面试通知'),
            "keyword2": getKey(params.title || '平台面试提醒通知'), //读取标题
            "keyword3": getKey(params.remark || '请您关注平台动态！'), //通知内容

            // "first": getKey(params.title || '平台面试提醒通知'),
            // "keyword1": getKey(params.sco_post_name || '未知'), //考试名称
            // "keyword2": getKey(params.time), //考试时间
            // // "keyword3": getKey(params.addr), //考试地点
            // "remark": getKey(params.remark || '请您关注平台动态！')
        }
    };
    await pushWechat(openid, msgData, params);
}


//10 网上报名成功通知  用于定时给考生
async function pushSignSuccess(openid, params) {
    var url = host + "/mp/applyInfo/" + params.app_id;
    var msgData = {
        "template_id": 'ZByixcgnAEIF8VVR0FbINr8jGKn5UafO8VR1aArp6As',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "first": getKey('您报名的岗位（' + params.pos_post_name + '）已确认报名，请知悉。'),
            "keyword1": getKey(params.app_name || '未知'), //姓名
            "keyword2": getDateTimeKey(params.app_apply_time), //时间
            "keyword3": getKey('待审核'), //审核结果
            "remark": getKey('请及时关注平台动态！')
            // "keyword3": getKey(params.pos_post_name), //报考类别
            // "keyword4": getKey(params.pos_dept_name), //报考考区考点
            // "remark": getKey('请您关注平台动态！')
        }
    };
    await pushWechat(openid, msgData, params);
}


//11 报名结果通知    用于给考生考生岗位考试时间冲突
async function pushSignAuditSuccess(openid, params) {
    var url = host + "/mp/applyInfo/" + params.app_id;
    var msgData = {
        "template_id": 'ZByixcgnAEIF8VVR0FbINr8jGKn5UafO8VR1aArp6As',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "first": getKey('您报名的岗位（' + params.pos_post_name + '）审核已通过，请知悉。'),
            "keyword1": getKey(params.app_name || '未知'), //用户名
            "keyword2": getDateTimeKey(params.app_apply_time), //报名时间（添加岗位时间）
            "keyword3": getKey('审核通过！'), //审核结果
            "remark": getKey('请及时关注平台动态！')
            // "first": getKey('恭喜您的报名的材料已审核，请知悉'),
            // "keyword1": getKey(params.pos_dept_name), //考区考点
            // "keyword2": getKey(params.app_name || '未知'), //用户名
            // "keyword3": getKey(params.pos_post_name), //报考专业  岗位名称
            // "keyword4": getKey((params.pos_written_subject || '')), //报考科目(post 笔试科目）
            // "remark": getKey('请您关注平台动态！')

        }
    };
    await pushWechat(openid, msgData, params);
}

//11 报名失败通知  用于考生推送审核不通过的信息
async function pushSignAuditFail(openid, params) {
    var url = host + "/mp/applyInfo/" + params.app_id;
    var color = '#F56C6C';
    var msgData = {
        "template_id": 'ZByixcgnAEIF8VVR0FbINr8jGKn5UafO8VR1aArp6As',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "first": getKey('您报名的岗位（' + params.pos_post_name + '）' + (params.app_status == -4 ? '申诉' : '') + '审核不通过，请知悉'),
            "keyword1": getKey(params.app_name || '未知', color), //报名姓名
            "keyword2": getDateTimeKey(params.app_apply_time, color), //报名时间（添加岗位时间）
            "keyword3": getKey('审核不通过'), //审核结果
            "remark": getKey((params.app_audit_remark || '') + '\n请您关注平台动态！', color)
        }
    };
    await pushWechat(openid, msgData, params);
}

//13 报名失败通知  用于考生报名冲突的提示
async function pushSignAuditConflict(openid, params) {
    var url = host + "/mp/applyInfo/" + params.app_id;
    var color = '#F56C6C';
    var msgData = {
        "template_id": 'ZByixcgnAEIF8VVR0FbINr8jGKn5UafO8VR1aArp6As',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "first": getKey('您报名的岗位（' + params.pos_post_name + '）' + '与其他招聘方案考试时间冲突，请及时处理'),
            "keyword1": getKey(params.app_name || '未知', color), //报名姓名
            "keyword2": getDateTimeKey(params.updatedAt, color), //服务时间
            "keyword3": getKey('报名失败'), //审核结果
            "remark": getKey('请您关注平台动态！', color)
        }
    };
    await pushWechat(openid, msgData, params);
}


//12 网上报名取消提醒	  用于定时给考生放弃报名的结果通知
async function pushApplyBack(openid, params) {
    var url = host + "/mp/applyInfo/" + params.app_id;
    var color = '#F56C6C';
    var msgData = {
        "template_id": '-vAsI6ma7Uz_gyV7gYnJSG97oRezzOdds7Bc5TWn-kY',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "first": getKey('您的报名放弃成功，请知悉'),
            "keyword1": getKey((params.app_name || '未知'), color), //姓名
            "keyword2": getDateTimeKey(params.updatedAt), //操作时间
            "keyword3": getKey((params.pos_post_name || ''), color), //取消内容
            "remark": getKey('放弃原因：' + (params.app_give_up_reason || '无') + '\n\n请您关注平台通知！', color)
        }
    };
    await pushWechat(openid, msgData, params);
}


//21待审核提醒  用于定时推送给用人单位审核人员 未审核的内容
async function pushAudit(openid, params) {
    var url = host + "/mp/" + params.id;
    var msgData = {
        "template_id": 'S6VWs0vHzL-MI-TggUwo5cUHHBI96saphbhRgeJKl6E',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "first": getKey('您的招聘方案有待审核的报名，请知悉'),
            "keyword1": getKey((params.proTitle || '')), //审批事项
            "keyword2": getKey('报名信息初审'), //业务类型
            "keyword3": getKey('共有' + (params.auditCount) + '人待审核'), //流水编号
            "keyword4": getDateTimeKey(), //递交时间
            "remark": getKey('请您及时进入平台进行操作！')
        }
    };
    await pushWechat(openid, msgData, params);
}

//21业务处理
async function pushProgress(openid, params) {
    // var url = host + "/mp/" + params.id;
    var msgData = {
        "template_id": 'IjwSLjGk5coAzZWsC24iTqjJmhUifcs3BiPtVqlu4OU',
        // "url": url,
        // "miniprogram": {
        //     "appid": miniprogramAppId,
        //     "pagepath": "pages/index"
        // },
        "data": {
            "first": getKey((params.first || '')),
            "keyword1": getKey((params.info || '')), //处理内容
            "keyword2": getKey((params.person || '')), //处理人员
            "keyword3": getKey((params.date || '')), //处理时间
            "remark": getKey((params.remark || ''))
        }
    };
    await pushWechat(openid, msgData, params);
}

//17 加分申请审核
async function pushBonusAudit(openid, params) {
    var url = host + "/mp/applyInfo/" + params.sco_app_id;
    let StatusData = {
        '1': '待审核',
        '2': '审核通过',
        '-1': '退回修改',
        '-2': '审核不通过',
    }
    var msgData = {
        "template_id": 'tvD-JYCVk-UOAB_-Vq9Ly_J0P2Pw_1LwRY1shcrdi_s',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "keyword1": getKey('加分申请审核结果'),
            "keyword2": getKey('已处理'),
            "keyword3": getKey(StatusData[params.sca_audit_status]), //审核结果
        }
    };
    await pushWechat(openid, msgData, params);
}

//18 资格复审审核
async function pushReviewAudit(openid, params) {
    var url = host + "/mp/applyInfo/" + params.sco_app_id;
    let StatusData = {
        '1': '待审核',
        '2': '审核通过',
        '-1': '放弃资格复审',
        '-2': '资格复审不通过',
        '-3': '材料复审不通过',
    }
    var msgData = {
        "template_id": 'tvD-JYCVk-UOAB_-Vq9Ly_J0P2Pw_1LwRY1shcrdi_s',
        "url": url,
        "miniprogram": {
            "appid": miniprogramAppId,
            "pagepath": "pages/index"
        },
        "data": {
            "keyword1": getKey('资格复审通知'),
            "keyword2": getKey('已处理'),
            "keyword3": getKey(StatusData[params.sco_recheck_status]), //审核结果
        }
    };
    await pushWechat(openid, msgData, params);
}

//18 postman重新推送
async function pushWrong(obj) {
    await pushReWechat(obj.usp_openid, JSON.parse(obj.usp_msg), obj);
}

/* pushAudit({
    id: "75b6276e-9061-4666-b971-96b8208feebb",
    openid:"oARec5zAkC0fCl4ZlcMu7ruC05c4",
    title: "验证推送",
    userCount: 1
}); */
/**
 * 返回微信推送消息key
 * @param value key值
 */
function getKey(value, color) {
    return {
        "value": value,
        "color": color || "#173177"
    };
}


function getDateTimeKey(dateStr) {
    var time = new Date(dateStr || '');
    var y = time.getFullYear();
    var m = time.getMonth() + 1;
    var d = time.getDate();
    m = m < 10 ? ("0" + m) : m;
    d = d < 10 ? ("0" + d) : d;
    var h = time.getHours();
    var mm = time.getMinutes();
    h = h < 10 ? ("0" + h) : h;
    mm = mm < 10 ? ("0" + mm) : mm;
    return {
        "value": y + "-" + m + "-" + d + " " + h + ":" + mm,
        "color": "#173177"
    };
}

async function sendResultMsg(userPushObj, error, body) {
    if (error) {
        userPushObj.usp_status = 3;//推送错误
        // var userPushLogObj = {
        //     upl_template_id: userPushObj.usp_template_id,
        //     upl_msg: userPushObj.usp_msg,
        //     user_id: userPushObj.user_id,
        //     upl_pro_id: userPushObj.usp_pro_id,
        //     upl_type: userPushObj.usp_type,
        //     upl_status:userPushObj.usp_status
        // }
        // await WxDbHelper.addPushFailLog(userPushLogObj);
        // console.error('wx_mp_api.js->pushWechat:openid', JSON.stringify(error));
    }
    if (body && body.errcode == 0) {
        userPushObj.usp_status = 1;//推送成功
        // console.log('-------成员单推到zhxy微信公众号成功', userPushObj.openid, body, error);
    } else if (body && body.errcode) {
        userPushObj.usp_status = 2;//推送错误
        // console.error('---------成员单推到zhxy微信公众号失败：', userPushObj.openid, body);
    }
    if (error && error.msg && [43101, 43004].includes(error.code)) {
        userPushObj.usp_status = 4;//未关注公众号 推送失败
        // console.error('未关注公众号 推送失败');
    }
    userPushObj.usp_result = (error ? JSON.stringify(error) : '') + (body ? JSON.stringify(body) : '');
    await WxDbHelper.addPushLog(userPushObj);
}
async function sendResultReMsg(userPushObj, error, body) {
    let obj = {}
    obj.usp_id = userPushObj.usp_id
    if (error) {
        obj.usp_status = 3;//推送错误
    }
    if (body && body.errcode == 0) {
        obj.usp_status = 1;//推送成功
        // console.log('-------成员单推到zhxy微信公众号成功', userPushObj.openid, body, error);
    } else if (body && body.errcode) {
        obj.usp_status = 2;//推送错误
        // console.error('---------成员单推到zhxy微信公众号失败：', userPushObj.openid, body);
    }
    if (error && error.msg && [43101, 43004].includes(error.code)) {
        obj.usp_status = 4;//未关注公众号 推送失败
        // console.error('未关注公众号 推送失败');
    }
    obj.usp_result = (error ? JSON.stringify(error) : '') + (body ? JSON.stringify(body) : '');
    await WxDbHelper.updatePushLog(obj);
}
//发送模板消息
//params {"userId":"5f585372f5c14078544bb4b4","id":"5f8fe923dda74779452be832","orgId":"5f1e51af943da80006efdfef","pushType":1,"name":"占梓妍","typeName":"准时到校","time":"2020.10.21 15:54:09","remark":"到校","vipEndDate":"2020-10-22T15:58:00.000Z","isLimit":1}
//msgData {"template_id":"ZIBcBDkQ7A8pBhTgBugg3sbnU5Wt-6glv_ZtlCgbgsI","url":"https://zhxy.fjtcwl.com/zhxy/log/5f8fe923dda74779452be832","data":{"first":{"value":"您的孩子已进入学校，请知悉","color":"#173177"},"keyword1":{"value":"占梓妍","color":"#173177"},"keyword2":{"value":"2020.10.21 15:54:09","color":"#173177"},"keyword3":{"value":"学校大门","color":"#173177"},"remark":{"value":"您当前免费体验天数剩余2天！\n\n进出校园信息推送功能为平台增值订阅服务，将提供一段时间免费试用！试用结束后，只推送周三的通行记录，订阅后可接收全部的通行记录信息。\n请点击订阅！","color":"#F56C6C"}}}
async function pushWechat(openid, msgData, params) {
    // if (!process.env.LEANCLOUD_APP_ENV || process.env.LEANCLOUD_APP_ENV == "development") {
    //     console.log('本地联调推送微信pushwechat:', JSON.stringify(msgData));
    // }
    var userPushObj = {
        usp_template_id: msgData.template_id,
        usp_msg: JSON.stringify(msgData),
        user_id: params.userId,
        usp_pro_id: params.projectId,
        usp_type: params.pushType
    };//用于记录用户推送的日志
    if (openid) { //只推送一个openid的用户
        userPushObj.usp_openid = openid;
        sendWeiXinReq(msgData, openid, pushMpDefault, function (error, body) {
            sendResultMsg(userPushObj, error, body);
        });
    }
}
async function pushReWechat(openid, msgData, obj) {
    // if (!process.env.LEANCLOUD_APP_ENV || process.env.LEANCLOUD_APP_ENV == "development") {
    //     console.log('本地联调推送微信pushwechat:', JSON.stringify(msgData));
    // }
    if (openid) { //只推送一个openid的用户
        // userPushObj.usp_openid = openid;
        sendWeiXinReq(msgData, openid, pushMpDefault, function (error, body) {
            sendResultReMsg(obj, error, body);
        });
    }
}

//发送微信模板消息请求
function sendWeiXinReq(data, touser, mpWx, cb) {
    // console.log(data, 'data');
    if (!data) {
        cb && cb({
            code: -1,
            msg: "消息内容格式错误发送失败！"
        });
        return;
    }
    var mpAppId = mpWx.mp_appid;
    var mpAppSec = mpWx.mp_secret;
    var accessTokenKeyObj = {
        name: "wxAccessToken",
        apid: mpAppId
    };
    toSendMsg();

    async function toSendMsg(tryTimes) { //需要做重试
        //请求到微信云托管服务
        data.touser = touser;
        var body = data
        // console.log(body,'body');
        var result = await wxapi.call('cgi-bin/message/template/send', body);
        if (result.errcode) {
            cb && cb({
                code: result.errcode,
                msg: result.errmsg,
                appId: mpAppId
            });
        } else {
            cb && cb(null, result);
        }
        return
        // console.log(data,'data');
        // request({
        //     url: global.wxCloudHost + "/pushMPMOdelMsg",
        //     body: data,
        //     json: true,
        //     method: "POST",
        // }, function (error, response, body) {
        //     console.log(1);
        //     if (!error && response.statusCode == 200) {
        //         console.log(2);
        //         if (!body || body.code) {
        //             console.log(3);
        //             console.error("sendWeiXinReq", body);
        //             cb && cb({
        //                 code: -1,
        //                 msg: "消息发送失败！"
        //             });
        //             return;
        //         }
        //         body = body.data;
        //         console.log(body,'body');
        //         if (body.errcode) {
        //             console.log(4);
        //             cb && cb({
        //                 code: body.errcode,
        //                 msg: body.errmsg,
        //                 appId: mpAppId
        //             });
        //         } else { //发送成功，返回
        //             console.log('发送成功');
        //             cb && cb(null, body);
        //         }
        //     } else {
        //         console.error(' mp_push.js->sendWeiXinReq', JSON.stringify(data), error);
        //         cb && cb({
        //             code: -1,
        //             msg: "消息发送失败！"
        //         });
        //     }
        // });

        return;
        tryTimes = tryTimes || 0;
        WxCommon.getAccess_token(mpAppId, mpAppSec, next);

        function next(access_token) {
            //console.log('/sendMsg token', access_token);
            if (access_token && access_token.code) {
                cb && cb(access_token); //获取access_token失败
                return;
            }
            var url = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + access_token;
            data.touser = touser;
            var msgData = JSON.stringify(data);
            //console.log('template send:', msgData);
            request.post(url, {
                form: msgData,
                json: true
            }, function (error, response, body) {
                // console.log('/sendMsg send', error, body);
                if (!error && response.statusCode == 200) {
                    if (body.errcode == 40001) {
                        //token失效重试一次
                        console.warn('mp_zhxy重新获取微信服务号token,isSecond=', tryTimes, '|token=', access_token);
                        if (tryTimes > 3) {
                            redisCache.delData(accessTokenKeyObj);
                        } else {
                            tryTimes += 1;
                        }
                        toSendMsg(tryTimes);
                        // cb && cb({
                        //     code: -1,
                        //     msg: "消息发送失败！"
                        // });
                        return;
                    }
                    if (body.errcode) {
                        cb && cb({
                            code: body.errcode,
                            msg: body.errmsg,
                            appId: mpAppId
                        });
                    } else { //发送成功，返回
                        cb && cb(null, body);
                    }
                } else {
                    console.error(' mp_push.js->sendWeiXinReq', msgData, error);
                    cb && cb({
                        code: -1,
                        msg: "消息发送失败！"
                    });
                }
            });
        }
    }
}

module.exports = {
    pushSignSuccess,
    pushSignAuditSuccess,
    pushSignAuditFail,
    pushSignAuditConflict,
    pushScoreTip,
    pushApplyBack,
    pushAudit,
    pushApplyNotice,
    pushExamNotice,
    pushInterviewNotice,
    pushProgress,
    pushBonusAudit,
    pushReviewAudit,
    pushWrong
};
