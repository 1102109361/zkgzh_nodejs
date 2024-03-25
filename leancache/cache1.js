// var AV = require('leanengine');
var _ = require('lodash');
var redis = require('./redis');
var redisClient = require('./redisDb1');
// var redis = require('./redis');
// var redisClient = redis.redisClient();
// redisClient.connect();

var defaultCacheSec = 60 * 60 * 24;//默认缓存一天时间
/**
 * 从缓存获取AVObject对象
 * @param obj AVObject
 * @param theSearch 查询的函数（若无缓存则会调用）
 * @param callBack 结果数据AVObject
 */

// async function getAVObject(obj, theSearch, callBack, overSec) {
//     var key = (typeof (obj) == "string") ? obj : redis.redisKey(obj);
//     var cachedObj = await redisClient.get(key);
//     if (cachedObj) {
//         callBack(AV.strToJson(cachedObj));
//     } else {
//         theSearch(async function(ret) {
//             if (ret) {
//                 // 将序列化后的 JSON 字符串存储到 LeanCache
//                 await redisClient.set(key, AV.jsonToStr(ret)).catch(console.error);
//                 redisClient.expire(key, overSec || defaultCacheSec);
//             }
//             callBack(ret);
//         });
//     }
// }

//获取数据
// async function getData(obj, theSearch, callBack, overSec) {
//     var key = (typeof (obj) == "string") ? obj : redis.redisKey(obj);
//     var cachedObj = redisClient.get(key);
//     if (cachedObj) {
//         callBack(JSON.parse(cachedObj));
//     } else {
//         theSearch(async function (ret) {
//             if (ret) {
//                 // 将序列化后的 JSON 字符串存储到 LeanCache
//                 await redisClient.set(key, JSON.stringify(ret)).catch(console.error);
//                 redisClient.expire(key, overSec || defaultCacheSec);
//             }
//             callBack(ret);
//         });
//     }
// }

// async function getDataJson(obj, theSearch, callBack, overSec) {
//     var key = (typeof (obj) == "string") ? obj : redis.redisKey(obj);
//     var cachedObj = await redisClient.getAsync(key)
//     if (cachedObj) {
//         callBack(JSON.parse(cachedObj));
//     } else {
//         theSearch(async function (ret) {
//             if (ret) {
//                 // 将序列化后的 JSON 字符串存储到 LeanCache
//                 await redisClient.set(key, JSON.stringify(ret)).catch(console.error);
//                 redisClient.expire(key, overSec || defaultCacheSec);
//             }
//             callBack(JSON.parse(JSON.stringify(ret)));
//         });
//     }
// }

//删除缓存数据
/*
    key:自定义匹配的KEY
 */
function delData(obj, isStart, key) {
    if (key) {
        if (process.env.RUN_TYPE == 1) {
            key = "testProject_" + key;
        }
        if (process.env.NODE_ENV != "production") {
            key = (process.env.NODE_ENV || "develop") + "_" + key;
        }
        redisClient.keys(key, function (err, keys) {
            if (keys && keys.length) redisClient.del(keys);
        });
        return;
    }
    var key = redis.redisKey(obj);
    if (isStart) {
        redisClient.keys(key + '*', function (err, keys) {
            if (keys && keys.length) redisClient.del(keys);
        });
    } else {
        redisClient.del(key).catch(console.error);
    }
}

//获取key下的数据
async function getDataOnly(obj, callBack) {
    var key = (typeof (obj) == "string") ? obj : redis.redisKey(obj);
    if (!callBack) {
        return redisClient.get(key);
    }
    var cachedObj = await redisClient.get(key);
    callBack(cachedObj);
}

//获取复合条件的key数组
// function getKeys(key, callBack) {
//     if (typeof (key) == "object") {
//         key = redis.redisKey(key);
//     }
//     redisClient.keys(key, function (err, keys) {
//         callBack(keys);
//     });
// }

//保存数据
// async function setData(obj, data) {
//     if (!data) return;
//     var key = (typeof (obj) == "string") ? obj : redis.redisKey(obj);
//     if (typeof (data) != "string") {
//         data = JSON.stringify(data);
//     }
//     await redisClient.set(key, data).catch(console.error);
//     return;
// }

//保存数据-限时
/*
obj-key
data-数据
time-超时时间秒
 */
async function saveDataTime(obj, data, time) {
    // console.log(data);
    if (!data) return;
    var key = (typeof (obj) == "string") ? obj : redis.redisKey(obj);
    await redisClient.set(key, JSON.stringify(data)).catch(console.error);
    redisClient.expire(key, time);
}

//设置缓存超时时间
// function setTimeout(obj, time) {
//     var key = redis.redisKey(obj);
//     redisClient.ttl(key, function (err, data) {
//         if (data > 0) return;
//         redisClient.expire(key, time);
//     });
// }

//获取缓存到期时间
// function getRedisOutTime(obj, callBack) {
//     var key = redis.redisKey(obj);
//     if (!callBack) {
//         return redisClient.ttl(key);
//     }
//     redisClient.ttl(key, function (err, data) {
//         callBack(data);
//     });
// }


// //删除设备缓存数据
// function delDeviceData(key, isStart, isDelDev) {
//     if (isStart) {
//         redisClient.keys('*' + key + '*', function (err, keys) {
//             if (isDelDev) {
//                 _.remove(keys, function (n) {
//                     return n == "DeviceInfo_" + key;
//                 });
//             }
//             if (keys.length) redisClient.del(keys);
//         });
//     } else {
//         redisClient.delAsync(key).catch(console.error);
//     }
// }

module.exports = {
    getDataOnly: getDataOnly,
    // getKeys: getKeys,
    // setData: setData,
    // getData: getData,
    redisKey: redis.redisKey,
    // getAVObject: getAVObject,
    // getDataJson: getDataJson,
    // setTimeout: setTimeout,
    saveDataTime: saveDataTime,
    // getRedisOutTime: getRedisOutTime,
    delData: delData,
    // delDeviceData: delDeviceData

};