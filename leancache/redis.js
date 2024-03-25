var redis = require('redis');

/*连接到实例device*/
function createClient() {
    // 本地环境下此环境变量为 undefined, node-redis 会链接到默认的 127.0.0.1:6379
    //10.0.0.11:6379
    var redisClient = redis.createClient({
         'url':'redis://127.0.0.1:6379'
        //  'url':'redis://10.0.0.11:6379'
        /* 
        * redis://[[username][:password]@][host][:port][/db-number]
        * 写密码redis://:123456@127.0.0.1:6379/0 
        * 写用户redis://uername@127.0.0.1:6379/0  
        * 或者不写密码 redis://127.0.0.1:6379/0
        * 或者不写db_number redis://127.0.0.1:6379
        * */
    })
    // var redisClient= redis.createClient(6379,'10.0.0.11',{})
    // 建议增加 redisDevice 的 on error 事件处理，否则可能因为网络波动或 redis server 主从切换等原因造成短暂不可用导致应用进程退出。
    redisClient.on('error', function(err) {
        return
        console.error('redis [ksbm] err:', err);
    });
    return redisClient;
}

/**
 * 获取具体消息内容
 * @param objectId
 * @param appType
 * @returns {string}
 */
function redisMessageDetailKey(objectId, appType) {
    return 'Message_' + objectId + "_" + appType;
}


/**
 * 获取具体消息内容
 * @param objectId
 * @param appType
 * @returns {string}
 */
function redisMessageListKey(userId, page, appType, deviceId, msgType, msgTime, rows) {
    return 'MessageList_' + userId + "_" + page + "_" + appType;
}

function redisDevAppKey(appId) {
    return 'devapp_' + appId;
}

function redisGateInfoKey(appId) {
    return 'GateInfo_' + appId;
}

/**
 * 获取具体消息内容
 * @param objectId
 * @param appType
 * @returns {string}
 */
function redisMessageDetailKey(objectId, appType) {
    return 'Message_' + objectId + "_" + appType;
}

/**
 * 获取用户设备
 * @param userId
 * @returns {string}
 */
function redisMyDeviceKey(userId) {
    return 'MyDevice_' + userId;
}

/**
 * 获取用户设备（首页）
 * @param userId
 * @param version
 * @returns {string}
 */
function redisMyDeviceByHomeKey(userId, version) {
    return 'MyDeviceByHome_' + userId + '_' + version;
}

/**
 * 获取用户设备
 * @param userId
 * @returns {string}
 */
function redisDeviceInfoKey(deviceNum) {
    return 'DeviceInfo_' + deviceNum;
}

function redisUserInfoKey(objId) {
    return 'UserInfo_' + objId;
}

//通用key拼接
function redisKey(obj) {
    var key = "";
    var isTokenKey = false;
    if (!obj || typeof (obj) == "string") {
        return obj || key;
    }
    if (obj.name == "wxAccessToken") {
        isTokenKey = true;
    }
    if (process.env.NODE_ENV != "production" && !isTokenKey) {
        key = process.env.NODE_ENV || "develop";
    }
    if (process.env.RUN_TYPE == 1) {
        key = key + (key ? "_" : "") + "testProject";
    }
    for (var n in obj) {
        if (!key) {
            key += obj[n];
        } else {
            key += "_" + obj[n];
        }
    }
    return key;
}


module.exports = {
    redisClient: createClient,
    redisMessageListKey: redisMessageListKey,
    redisDevAppKey: redisDevAppKey,
    redisGateInfoKey: redisGateInfoKey,
    redisMessageDetailKey: redisMessageDetailKey,
    redisKey: redisKey,
    createClient: createClient,
    redisMyDeviceKey: redisMyDeviceKey,
    redisDeviceInfoKey: redisDeviceInfoKey,
    redisUserInfoKey: redisUserInfoKey,
    redisMyDeviceByHomeKey: redisMyDeviceByHomeKey
};
