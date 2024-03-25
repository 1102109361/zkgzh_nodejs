var SqlString = require("sqlstring");
var WxDbHelper = require('../routes/wx-mp/wx_db');//微信操作相关的公共方法
async function set(key, data) {
    var sql1 = SqlString.format("select data from ksbm_redis where `key`=?", key)
    var redisData = await DbTools1.queryAsync(sql1);
    if (redisData.length) {
        var sql = SqlString.format("update  ksbm_redis set data=?,endTime=? where `key`=?", [data, WxDbHelper.changeDate(Date.now() + 60 * 5, 'yyyy-MM-dd hh:mm:ss'), key])
        return await DbTools1.queryAsync(sql);
    } else {
        let params = {
            key,
            data,
            endTime: WxDbHelper.changeDate(Date.now() + 60 * 5, 'yyyy-MM-dd hh:mm:ss')
        }
        var sql = SqlString.format("insert into ksbm_redis set ?", params)
        return await DbTools1.queryAsync(sql);
    }


}
async function get(key) {
    var sql = SqlString.format("select data from ksbm_redis where `key`=? and endTime>=?", [key, WxDbHelper.changeDate(Date.now() - 5 * 60, 'yyyy-MM-dd hh:mm:ss')])
    var data = await DbTools1.queryAsync(sql);
    return data.length ? data[0].data : null
}

async function del(keys) {
    var sql = SqlString.format("delete from ksbm_redis where `key` in(?)", [keys])
    return await DbTools1.queryAsync(sql);
}

async function keys(key, cb) {
    var sql = SqlString.format("select * from ksbm_redis where `key` like ?", [`%${key}%`])
    try {
        let data = await DbTools1.queryAsync(sql);
        cb(data)
    } catch (error) {
        cb(error)
    }

}

async function expire(key, time) {
    var sql1 = SqlString.format("select endTime from ksbm_redis where `key`=?", [key])
    var data = await DbTools1.queryAsync(sql1)
    let endTime = new Date(data[0].endTime).getTime()
    var sql = SqlString.format("update ksbm_redis set endTime=? where `key`=?", [WxDbHelper.changeDate(endTime + time * 1000, 'yyyy-MM-dd hh:mm:ss'), key])
    return await DbTools1.queryAsync(sql);
}

// function ttl(key) {

// }


// function getAsync(key) {

// }

// function delAsync(key) {

// }

module.exports = {
    get,
    set,
    del,
    keys,
    expire
}