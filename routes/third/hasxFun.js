/*
 * @Author: 陈瑞峰 chenryuf@163.com
 * @Date: 2022-05-11 16:22:54
 * @LastEditors: 陈瑞峰 chenryuf@163.com
 * @LastEditTime: 2022-05-23 08:58:12
 * @FilePath: \ksbm\routes\third\hasxFun.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 成都华安视讯 HASX 防疫调整平台接口对接 hasx
'use strict';
var crypto = require("crypto");
var request = require("request");
var md5 = require('blueimp-md5');
var _ = require('lodash');

var device_db = require('./device_db');
var qiniuFile = require('./qiniuFile');


var targetOId = "";//机构ID
var aesKey = "";//aes加密key
var testHost = "";//测试域名
var host = "";//正式域名

//存储通行日志
async function savePassLog(params) {
    /* 
    log_id	           varchar	 数据ID
    log_name	       varchar	 通行人员
    log_dev_sn	       varchar   通行设备序列号
    log_id_card	       varchar	 人员身份证
    log_id_info	       json      身份证信息
    log_pass_time	   datetim   通行时间
    log_temperature	   int       通行温度
    log_health_code	   varchar	 健康码信息
    log_trip_code	   varchar	 行程码信息
    dept_id	           bigint    所属部门
    user_id	           bigint    操作人
    */
    var sequence_no = params.sequence_no + "";
    var oldLog = await device_db.getPassLog(sequence_no, params.device_sn);
    if (oldLog) return;//已有对应的日志
    var closeup_pic = params.closeup_pic;//图片信息
    qiniuFile.upFileToQiNiu({
        "passFace": {
            rid: "passFace",
            fileName: `passFace.${closeup_pic.format}`,
            buffer: Buffer.from(closeup_pic.data, "base64")
        }
    }, async (fileObj) => {
        var fileUrl = fileObj["passFace"];
        closeup_pic.data = fileUrl;
        params.closeup_pic = closeup_pic;
        var healthcode_info = params.healthcode_info;//健康码信息
        var match = params.match;//核对信息
        var person = params.person;//人员信息
        var saveObj = {
            log_msgid: sequence_no,
            log_name: healthcode_info.name,
            log_dev_sn: params.device_sn,
            log_id_card: healthcode_info.number,
            log_pass_time: params.cap_time,
            log_temperature: +parseInt(person.temperatur) || 0,
            log_health_code: match.customer_text,
            log_img: fileUrl,
            log_detail: JSON.stringify(params)
        };
        await device_db.addPassLog(saveObj);
    });
    return;
}

module.exports = {
    savePassLog
};
