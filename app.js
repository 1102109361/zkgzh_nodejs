'use strict';

var express = require('express');
var timeout = require('connect-timeout');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var AV = require('leanengine');
const mysql = require('mysql2');
var SqlString = require("sqlstring");
//微信云服务地址
// global.wxCloudHost = "https://ksbmmp.fjrst.cn";//临时域名
// global.wxCloudHost = "https://mps.ksbm.fjrst.cn";
const wxapi = require('./work/wxapi')

// Loads cloud function definitions.
// You can split it into multiple files but do not forget to load them in the main file.
// require('./cloud');
// require('./routes/wx-mp/wxMp');//福建招聘平台微信公众号对接

var app = express();
// Configures template engine.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
}));
app.use(express.json({
    limit: 5 * 1024 * 1024
}));

app.use(express.urlencoded({
    limit: 5 * 1024 * 1024,
    extended: false
}))
// app.use(express.json({ limit: '50mb' }))
// app.use(express.urlencoded({ limit: '50mb', extended: false }))
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb' , extended: false }));
// app.use('/static', express.static(path.join(__dirname, 'public')))
const indexRouter = require('./routes/index')
app.use('/', indexRouter);
app.use("/mpServe", require("./routes/mpServe"));
// app.use("/mp", require('./routes/wx-mp/wxMpController'));//福建招聘平台微信公众号公众号对接

// app.use(function (req, res, next) {
//     next(createError(404))
// })

// app.use(function (err, req, res, next) {
//     res.locals.message = err.message
//     res.locals.error = req.app.get('env') === 'development' ? err : {}
//     res.send(404)
// })
// Configures default timeout.
app.use(timeout('15s'));

// Loads LeanEngine middleware.
app.use(AV.express());

app.enable('trust proxy');
// Uncomment the following line to redirect all HTTP requests to HTTPS.
// app.use(AV.Cloud.HttpsRedirect());

app.use(express.static('public'));



app.use(cookieParser());

/**
 * Mysql数据库连接
 *
 */

// const dbConfig = JSON.parse(process.env.MY_SQL || '{}');
const dbConfig = JSON.parse(process.env.MY_SQL || '{"host": "114.116.5.225", "port": "3306", "user": "zzhy-lc", "password": "zzhy-lc#2022", "database": "ksbm_pre", "waitForConnections": true, "connectionLimit": 180, "queueLimit": 0}');
// console.log(dbConfig, 'dbConfig');
const SqlConnectPool = mysql.createPool(dbConfig);

SqlConnectPool.on('connection', function (connection) {
    console.log("SqlConnectPool 连接", JSON.stringify(dbConfig));
});

const DbTools = {
    queryAsync: (sql, para) => { // 执行
        return new Promise((resolve, reject) => {
            SqlConnectPool.getConnection((err, conn) => {
                if (err) {
                    console.error('DbTools error:', err.code, err.sqlMessage);
                    return reject(err);
                }
                conn.query(sql, para, (err, rows) => {
                    conn.release();
                    if (err) {
                        console.error('DbTools query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                        return reject(err);
                    }
                    return resolve(rows);
                });
            });
        });
    },
    query: (sql, para, cb) => { // 执行
        SqlConnectPool.getConnection((err, conn) => {
            if (err) {
                console.error('DbTools error:', err.code, err.sqlMessage);
                cb && cb(err);
            }
            conn.query(sql, para, (err, rows) => {
                conn.release();
                if (err) {
                    console.error('DbTools query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                    cb && cb(err);
                    return;
                }
                cb && cb(err, rows);
            });
        });

    }
};

global.DbTools = DbTools;
DbTools.queryAsync('SELECT count(*) as userlogCount FROM ksbm_weixin_user').then(function (ret) {
    console.log('mysql请求数据列表结果', ret);
}).catch(function (err) {
    console.error('DbTools.queryAsync error:', err.sqlMessage);
});

//获取地区
DbTools.queryAsync('SELECT * FROM ksbm_area limit 0,1000').then(function (ret) {
    var areaNameToCode = {};
    var areaCodeToName = {};
    ret.forEach(function (node) {
        var name = node.are_name || "";
        var code = node.are_id || "";
        areaNameToCode[name] = code;
        areaCodeToName[code] = {
            code: code,
            name: name
        };
    });
    global.areaNameToCode = areaNameToCode;
    global.areaCodeToName = areaCodeToName;
});


// const dbConfig1 = JSON.parse(process.env.MY_SQL1 || '{}');
const dbConfig1 = JSON.parse(process.env.MY_SQL1 || '{"host": "114.116.5.225", "port": "3306", "user": "zzhy-lc", "password": "zzhy-lc#2022", "database": "ksbm_na", "waitForConnections": true, "connectionLimit": 180, "queueLimit": 0}');
// console.log(dbConfig1, 'dbConfig1');

const SqlConnectPool1 = mysql.createPool(dbConfig1);

SqlConnectPool1.on('connection', function (connection) {
    console.log("SqlConnectPool1 连接", JSON.stringify(dbConfig1));
});

const DbTools1 = {
    queryAsync: (sql, para) => { // 执行
        return new Promise((resolve, reject) => {
            SqlConnectPool1.getConnection((err, conn) => {
                if (err) {
                    console.error('DbTools1 error:', err.code, err.sqlMessage);
                    return reject(err);
                }
                conn.query(sql, para, (err, rows) => {
                    conn.release();
                    if (err) {
                        console.error('DbTools1 query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                        return reject(err);
                    }
                    return resolve(rows);
                });
            });
        });
    },
    query: (sql, para, cb) => { // 执行
        SqlConnectPool1.getConnection((err, conn) => {
            if (err) {
                console.error('DbTools1 error:', err.code, err.sqlMessage);
                cb && cb(err);
            }
            conn.query(sql, para, (err, rows) => {
                conn.release();
                if (err) {
                    console.error('DbTools1 query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                    cb && cb(err);
                    return;
                }
                cb && cb(err, rows);
            });
        });

    }
};

global.DbTools1 = DbTools1;
DbTools1.queryAsync('SELECT count(*) as userlogCount FROM ksbm_weixin_user').then(function (ret) {
    console.log('mysql请求数据列表结果', ret);
}).catch(function (err) {
    console.error('DbTools1.queryAsync error:', err.sqlMessage);
});

//获取地区
DbTools1.queryAsync('SELECT * FROM ksbm_area limit 0,1000').then(function (ret) {
    var areaNameToCode = {};
    var areaCodeToName = {};
    ret.forEach(function (node) {
        var name = node.are_name || "";
        var code = node.are_id || "";
        areaNameToCode[name] = code;
        areaCodeToName[code] = {
            code: code,
            name: name
        };
    });
    global.areaNameToCode = areaNameToCode;
    global.areaCodeToName = areaCodeToName;
});

const dbConfig2 = JSON.parse(process.env.MY_SQL2 || '{"host": "114.116.5.225", "port": "3306", "user": "zzhy-dev", "password": "zzhy-dev#2022", "database": "fjzk", "waitForConnections": true, "connectionLimit": 180, "queueLimit": 0}');
// console.log(dbConfig2, 'dbConfig2');

const SqlConnectPool2 = mysql.createPool(dbConfig2);

SqlConnectPool2.on('connection', function (connection) {
    console.log("SqlConnectPool2 连接", JSON.stringify(dbConfig2));
});

const DbTools2 = {
    queryAsync: (sql, para) => { // 执行
        return new Promise((resolve, reject) => {
            SqlConnectPool2.getConnection((err, conn) => {
                if (err) {
                    console.error('DbTools2 error:', err.code, err.sqlMessage);
                    return reject(err);
                }
                conn.query(sql, para, (err, rows) => {
                    conn.release();
                    if (err) {
                        console.error('DbTools2 query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                        return reject(err);
                    }
                    return resolve(rows);
                });
            });
        });
    },
    query: (sql, para, cb) => { // 执行
        SqlConnectPool2.getConnection((err, conn) => {
            if (err) {
                console.error('DbTools2 error:', err.code, err.sqlMessage);
                cb && cb(err);
            }
            conn.query(sql, para, (err, rows) => {
                conn.release();
                if (err) {
                    console.error('DbTools2 query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                    cb && cb(err);
                    return;
                }
                cb && cb(err, rows);
            });
        });

    }
};

global.DbTools2 = DbTools2;
DbTools2.queryAsync('SELECT count(*) as userlogCount FROM ksbm_weixin_user').then(function (ret) {
    console.log('mysql请求数据列表结果', ret);
}).catch(function (err) {
    console.error('DbTools2.queryAsync error:', err.sqlMessage);
});

//获取地区
DbTools2.queryAsync('SELECT * FROM ksbm_area limit 0,1000').then(function (ret) {
    var areaNameToCode = {};
    var areaCodeToName = {};
    ret.forEach(function (node) {
        var name = node.are_name || "";
        var code = node.are_id || "";
        areaNameToCode[name] = code;
        areaCodeToName[code] = {
            code: code,
            name: name
        };
    });
    global.areaNameToCode = areaNameToCode;
    global.areaCodeToName = areaCodeToName;
});
// TODO 库变更
const dbConfig3 = JSON.parse(process.env.MY_SQL3 || '{"host": "114.116.5.225", "port": "3306", "user": "zzhy-dev", "password": "zzhy-dev#2022", "database": "ksbm_na_sr", "waitForConnections": true, "connectionLimit": 180, "queueLimit": 0}');

const SqlConnectPool3 = mysql.createPool(dbConfig3);

SqlConnectPool3.on('connection', function (connection) {
    console.log("SqlConnectPool3 连接", JSON.stringify(dbConfig3));
});

const DbTools3 = {
    queryAsync: (sql, para) => { // 执行
        return new Promise((resolve, reject) => {
            SqlConnectPool3.getConnection((err, conn) => {
                if (err) {
                    console.error('DbTools3 error:', err.code, err.sqlMessage);
                    return reject(err);
                }
                conn.query(sql, para, (err, rows) => {
                    conn.release();
                    if (err) {
                        console.error('DbTools3 query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                        return reject(err);
                    }
                    return resolve(rows);
                });
            });
        });
    },
    query: (sql, para, cb) => { // 执行
        SqlConnectPool3.getConnection((err, conn) => {
            if (err) {
                console.error('DbTools3 error:', err.code, err.sqlMessage);
                cb && cb(err);
            }
            conn.query(sql, para, (err, rows) => {
                conn.release();
                if (err) {
                    console.error('DbTools3 query errorcode:', err.code, '|message:', err.sqlMessage, sql);
                    cb && cb(err);
                    return;
                }
                cb && cb(err, rows);
            });
        });

    }
};

global.DbTools3 = DbTools3;
DbTools3.queryAsync('SELECT count(*) as userlogCount FROM ksbm_weixin_user').then(function (ret) {
    console.log('mysql请求数据列表结果', ret);
}).catch(function (err) {
    console.error('DbTools3.queryAsync error:', err.sqlMessage);
});

//获取地区
DbTools3.queryAsync('SELECT * FROM ksbm_area limit 0,1000').then(function (ret) {
    var areaNameToCode = {};
    var areaCodeToName = {};
    ret.forEach(function (node) {
        var name = node.are_name || "";
        var code = node.are_id || "";
        areaNameToCode[name] = code;
        areaCodeToName[code] = {
            code: code,
            name: name
        };
    });
    global.areaNameToCode = areaNameToCode;
    global.areaCodeToName = areaCodeToName;
});

app.get('/', function (req, res) {
    res.render('index', { currentTime: new Date() });
});

// You can store routings in multiple files according to their categories.
// app.use('/todos', require('./routes/todos'));
app.use("/dev", require('./routes/third/device_admin'));//设备管理
app.use("/wx", require('./routes/wx-mini/wxApi'));//事业单位微信小程序接口
app.use("/wx1", require('./routes/wx-mini/wxApi1'));//国有企业微信小程序接口
app.use("/wx2", require('./routes/wx-mini/wxApi2'));//福建招考微信小程序接口
app.use("/wx3", require('./routes/wx-mini/wxApi3'));//数人微信小程序接口
app.use("/mp_ksbm", require('./routes/wx-mp/mp_ksbm'));//福建招聘平台微信公众号对接
app.use("/mp", require('./routes/wx-mp/wxMpController'));//福建招聘平台微信公众号对接
app.use("/mp1", require('./routes/wx-mp/wxMp1Controller'));//福建国有企业公开招聘公众号对接
app.use("/mp2", require('./routes/wx-mp/wxMp2Controller'));//福建国有企业公开招聘公众号对接
app.use("/mp3", require('./routes/wx-mp/wxMp3Controller'));//数人国企招聘公众号对接
app.use("/hasx", require('./routes/third/hasx'));//成都华安视讯硬件对接接口
app.use("/newland", require('./routes/third/newland'));//新大陆防疫设备件对接接口
app.use("/hikyun", require('./routes/third/hikyun'));//测温云
app.use("/rv1109", require('./routes/third/rv1109'));//福州伟拓人脸测温

app.use(function (req, res, next) {
    // If there is no routing answering, throw a 404 exception to exception handlers.
    if (!res.headersSent) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    }
});

// error handlers
app.use(function (err, req, res, next) {
    if (req.timedout && req.headers.upgrade === 'websocket') {
        // Ignores websocket timeout.
        return;
    }

    var statusCode = err.status || 500;
    if (statusCode === 500) {
        console.error(err.stack || err);
    }
    if (req.timedout) {
        console.error('Request timeout: url=%s, timeout=%d, please check whether its execution time is too long, or the response callback is invalid.', req.originalUrl, err.timeout);
    }
    res.status(statusCode);
    // Do not output exception details by default.
    var error = {};
    if (app.get('env') === 'development') {
        // Displays exception stack on page if running in the development environment.
        error = err;
    }
    res.render('error', {
        message: err.message,
        error: error
    });
});
//推送失败 重新推送定时器
// setInterval(async () => {
//     let sql=`select * from ksbm_user_push_log where upl_status=3 and upl_openid='${'oARec5_i2iY0O1utlKeR-HA-mGQQ'}' ORDER BY createdAt LIMIT 500`
//     var failPushObj = await DbTools.queryAsync(sql);
//     for (let n of failPushObj) {
//         let body
//         if (!n.upl_msg||!n.upl_openid) {
//             body=JSON.parse(n.upl_msg_data)
//         } else {
//             body=JSON.parse(n.upl_msg)
//             body.touser = n.upl_openid;
//         }
//         let result = await wxapi.call('cgi-bin/message/template/send', body);
//         if (result.errcode) {
//             console.log({
//                 code: result.errcode,
//                 msg: result.errmsg,
//             },'定时器重新推送失败，upl_id：',n.upl_id);
//         } else {
//             let sql_pass = SqlString.format("update ksbm_user_push SET usp_status=1 where usp_id=?", [n.upl_id]);
//             let sql_pass2 = SqlString.format("update ksbm_user_push_log SET upl_status=1 where upl_id=?", [n.upl_id]);
//             try {
//                 await DbTools.queryAsync(sql_pass);
//                 await DbTools.queryAsync(sql_pass2);
//             } catch (e) {
//                 console.error('推送成功状态更新失败', e);
//             }
//         }
//     }
// }, 10000);
module.exports = app;
