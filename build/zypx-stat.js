(function () {
  var domain = "https://open.fjrst.cn/", // 请求域名
    appId = "", // 应用ID
    appSecret = "", // 应用密钥
    idCard = "", // 身份证号（学员）
    packageId = "", // 课程包id
    courseId = "", // 课程id
    control = false, // 是否控制执行
    token = "", // 用户token
    code = "", // 验证码
    timer = null, // 定时器
    flag = false, // 标记服务是否开启
    selector = '', // 自定义选择器 
    globalCallback = null // 回调方法
  
  // 页面加载完成后插入弹窗节点
  window.onload = function () {
    handleHtmlAndEvent()
  }

  // 挂在全局对象
  window.zypxStat = {
    init: function (params) {
      var _this = this
      appId = params.appId
      appSecret = params.appSecret
      domain = params.apiUrl || "https://open.fjrst.cn/"
      idCard = params.idCard
      packageId = params.packageId
      courseId = params.courseId
      control = params.control
      selector = params.selector
      token=params.token
      code=params.code
      page=params.page
      size=params.size
      checkStatus=params.checkStatus
      globalCallback = params.callback
      globalCallback && globalCallback({
        appId,
        appSecret,
        idCard,
        packageId,
        courseId,
        control,
        msg: "插件初始化完成"
      })
      if (!control) {
        // 用户未控制，自动执行
        _this.autoExec(globalCallback || function (res) {
          // 默认回调，避免用户未设置回调函数异常报错
          // console.log("默认回调",res)
        })
      }
    },
    // 设置课程id
    setCouseId: function (pId, cId) {
      courseId = cId
      packageId = pId
      globalCallback && globalCallback({
        code: 0,
        msg: '切换课程成功',
        data: {
          courseId,
          packageId
        }
      })
    },
    // 自动执行
    autoExec: function (callback) {
      handleAutoExec(callback)
    },
    // 开始
    play: function (callback) {
      handleStart(callback);
    },
    // 监听
    watch: function (callback,time,timeClose) {
      handleWatch(callback,time,timeClose);
    },
    // 暂停
    pause: function () {
      clearInterval(timer);
    },
    // 提交验证码
    submitCode: function (callback) {
      handleCheckCode(callback)
    },
    // 结束上报
    over: function (callback) {
      clearInterval(timer);
      handleStudyEnd(callback)
    },
    getLog: function(callback){
      handleGetLog(callback)
    },
    getLogLost: function(callback){
      handleGetLogLost(callback)
    }
  }

  // 关闭窗口前触发学习结束上报
  if (window.addEventListener) {
    window.addEventListener("beforeunload", handleStudyEnd, false);
    window.onbeforeunload = handleStudyEnd;
  } else if (window.attachEvent) {
    window.attachEvent("onbeforeunload", handleStudyEnd);
  } else {
    if (window.onbeforeunload) {
      window.onbeforeunload = handleStudyEnd;
    }
  }

  // 开始操作
  function handleStart(callback) {
    getToken(callback);
  }

  // 开启监听
  function handleWatch(callback,time,timeClose) {
    clearInterval(timer);
    heartBeat(callback);
    timer = setInterval(function () {
      heartBeat(callback);
    }, time*1000||3000)
    if(timeClose){
      setTimeout(() => {
        handleStop()
      }, timeClose*1000);
    }
  }

  // 结束操作
  function handleStop() {
    clearInterval(timer);
  }

  // 获取token
  function getToken(callback) {
    // 执行关闭请求置为true
    flag = true;
    http.ajaxRequest({
      url: domain + "v1/token",
      method: "post",
      dataType: 'json', //返回json数据格式
      data: {
        idCard,
        appId,
        appSecret,
      },
      success: function (res) {
        if (res.code == 0) {
          token = res.data.access_token;
        }
        // token请求单独回调
        callback(res)
        // 全局回调
        globalCallback(res)
      },
      error: function (err) {
        // handleDialogTrigger(true)
        callback(err)
        globalCallback(err)
      }
    })
  }

  // 自动执行监听
  function handleAutoExec(callback) {
    getToken(function (res) {
      callback(res)
      if (res.code == 0) {
        handleWatch(callback)
      }
    })
  }

  // 心跳包
  function heartBeat(callback) {
    http.ajaxRequest({
      url: domain + "v1/heartbeat",
      method: 'get',
      data: {
        token,
        packageId,
        courseId,
      },
      success: function (res) {
        // 单独回调
        callback && callback(res)
        // 全局回调
        globalCallback(res)
        // 正常
        if (res.code == 0) {

        }
        // 需要输入验证码
        if (res.code == 1) {
          // handleStop();
          handleDialogTrigger(true)
        }
        // token验证失败
        if (res.code == 410) {
          handleStop();
          // $('#msg-con').append("<div>" + res.msg + ' ' + new Date() + "</div>")
          // alert(res.msg || 'token验证失败')
        }
      },
      error: function (err) {
        // handleDialogTrigger(true)
        callback && callback(res)
        globalCallback(err)
      }
    })
  }

  // 验证码提交
  function handleCheckCode(callback) {
    http.ajaxRequest({
      url: domain + "v1/checkCode",
      data: {
        token: token,
        code: code,
      },
      success: function (res) {
        callback(res)
        globalCallback(res)
        handleDialogTrigger()
        if (res.code == 0) {
          // handleAutoExec(callback)
        } else {
          // alert(res.msg)
        }
      },
      error: function (err) {
        callback(err)
        globalCallback(err)
      }
    })
  }

  // 学习结果上报
  function handleStudyEnd(callback) {
    if (flag) {
      http.ajaxRequest({
        url: domain + "v1/studyEnd",
        data: {
          token,
          packageId,
          courseId,
        },
        success: function (res) {
          callback(res)
          if (res.code == 0) {

          }
        },
        error: function (err) {
          callback(err)

        }
      })
    }
  }

  //获取log
  function handleGetLog(callback){
    http.ajaxRequest({
      url: domain + "v1/studyLog",
      method: 'get',
      data: {
        token,
        packageId,
        courseId,
        page,
        size,
        checkStatus,
      },
      success: function (res) {
        callback(res)
        if (res.code == 0) {

        }
      },
      error: function (err) {
        callback(err)

      }
    })
  }
    //获取loglost
    function handleGetLogLost(callback){
      http.ajaxRequest({
        url: domain + "v1/studyLogLost",
        method: 'get',
        data: {
          token,
          packageId,
          courseId,
          page,
          size,
          checkStatus,
        },
        success: function (res) {
          callback(res)
          if (res.code == 0) {
  
          }
        },
        error: function (err) {
          callback(err)
  
        }
      })
    }

  // 添加html、绑定事件
  function handleHtmlAndEvent() {
    // 插入弹窗dom
    var div = document.createElement("div");
    if (selector) {
      if (selector[0] == '#') {
        div.id = selector.substring(1)
      } else if (selector[0] == '.') {
        div.className = selector.substring(1)
      } else {
        div.id = selector
      }
    }
    div.innerHTML = `
      <div class="zypx-message-box__wrapper">
        <div class="zypx-message-box">
          <div class="zypx-message-box__header">
            <div class="zypx-message-box__title">输入验证码</div>
            <button class="zypx-message-box__headerbtn">X</button>
          </div>
          <div class="zypx-message-box__content">
            <div class="zypx-alert">学员通过“职补小助手”小程序进行人脸验证后可查看验证码。</div>
            <div class="zypx-input">
              <input type="text" id="code-value" class="zypx-input__inner" placeholder="请输入">
            </div>
            <div class="zypx-tip-box">
              <span class="zypx-tip-box__text">请输入验证码</span>
            </div>
          </div>
          <div class="zypx-message-box__btns">
            <button id="submit-btn" class="zypx-button">提交</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div)
    // 插入弹窗样式
    var styleNode = document.createElement('style')
    styleNode.type = "text/css"
    if (styleNode.styleSheet) {
      styleNode.styleSheet.cssText = styleStr
    } else {
      styleNode.innerHTML = styleStr
    }
    document.getElementsByTagName('head')[0].appendChild(styleNode);

    // 关闭按钮dom
    var closeBtn = document.getElementsByClassName('zypx-message-box__headerbtn')
    // 提交按钮dom
    var submitBtn = document.getElementById('submit-btn')
    // 输入框dom
    var inputDom = document.getElementById('code-value')

    // 绑定关闭事件
    closeBtn[0].onclick = function () {
      handleDialogTrigger()
    }
    // 绑定验证码提交事件
    submitBtn.onclick = function () {
      // 获取赋值验证码
      code = inputDom.value
      if (code) {
        // 提交验证码
        handleCheckCode(function (res) {
          console.log(res,'提交验证码');
          if (res.code == 0) {
            handleDialogTrigger()
          }
        })
      } else {
        handleTriggerError(true)
      }
    }
  }

  // 显示/关闭验证码弹窗
  function handleDialogTrigger(flag) {
    var boxDom = document.getElementsByClassName('zypx-message-box__wrapper')
    handleTriggerError()
    if (flag) {
      boxDom[0].style.cssText = 'visibility:inherit'
    } else {
      boxDom[0].style.cssText = 'visibility:hidden'
    }
  }

  // 显示/隐藏错误提示
  function handleTriggerError(flag) {
    var textDom = document.getElementsByClassName('zypx-tip-box__text')
    if (flag) {
      textDom[0].style.cssText = 'visibility:inherit'
    } else {
      textDom[0].style.cssText = 'visibility:hidden'
    }
  }

  // ajax封装
  var http = {};
  http.ajaxRequest = function (options) {
    options = options || {}; //调用函数时如果options没有指定，就给它赋值{},一个空的Object
    options.method = (options.method || "POST").toUpperCase(); /// 请求格式GET、POST，默认为GET
    options.dataType = options.dataType || "json"; //响应数据格式，默认json
    options.contentType = options.contentType || 'application/json;charset=UTF-8';
    options.headers = options.headers || {};
    options.data = options.data || null;
    options.timeout = options.timeout || 10000;
    options.async = options.async || true;
    // var params = formatParams(options.data);//options.data请求的数据

    //请求的数据
    var params = [];
    if (options.data && typeof options.data === 'object') {
      for (let key in options.data) {
        params.push(key + '=' + options.data[key]);
      }
      //处理缓存问题
      params.push(("v=" + Math.random()).replace(".", ""));
      params = params.join("&");
    }

    //添加公共请求头
    var authorization = localStorage.getItem("authorization");
    if (authorization) {
      options.headers["authorization"] = authorization;
    }

    var xhr;

    //考虑兼容性
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else if (window.ActiveObject) { //兼容IE6以下版本
      xhr = new ActiveXobject('Microsoft.XMLHTTP');
    }

    //设置超时
    // (options.timeout > 0) &&(xhr.timeout = options.timeout);
    //启动并发送一个请求
    if (options.method === 'GET') {
      xhr.open("GET", options.url + "?" + params, options.async);
      xhr.send(null);
    } else if (options.method == "POST") {
      xhr.open("POST", options.url, options.async);
      xhr.setRequestHeader("x-requested-with", "XMLHttpRequest")
      xhr.setRequestHeader("cache-control", "no-cache");
      //Content-type数据请求的格式
      xhr.setRequestHeader("Content-type", options.contentType);

      for (let key in options.headers) {
        xhr.setRequestHeader(key, options.headers[key]); //设置请求头
      }

      if (options.contentType.toLowerCase().indexOf("json") > 0) {
        if (typeof options.data === 'object') {
          try {
            options.data = JSON.stringify(options.data);
          } catch (e) {}
        }
        //设置表单提交时的内容类型
        xhr.send(options.data);
      } else {
        //设置表单提交时的内容类型
        xhr.send(params);
      }

    }

    //    设置有效时间
    setTimeout(function () {
      if (xhr.readySate != 4) {
        xhr.abort();
      }
    }, options.timeout)

    xhr.onreadystatechange = function () {
      var status = xhr.status;
      var isSuccess = status >= 200 && status < 300 || status === 304;
      if (xhr.readyState == 4) {
        if (isSuccess) {
          // console.log('ajax请求成功:', xhr.response)
          if (options.dataType === 'json') {
            var res = JSON.parse(xhr.responseText);
            if (res.code == 401) {
              // localStorage.getItem("access_token");
              // window.location.href = 'account'
              return;
            }
            options.success && options.success(res, status, xhr.responseXML);
          } else {
            options.success && options.success(xhr.responseText, status, xhr.responseXML);
          }
          // options.success && options.success(xhr.responseText,status,xhr.responseXML);

        } else {
          options.error && options.error(status);
        }
      }
    }
  }

  // 弹窗内联样式
  var styleStr = `
    .zypx-message-box__wrapper {
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      justify-content: center;
      visibility: hidden;
    }
    
    .zypx-message-box {
      display: inline-block;
      width: 420px;
      padding-bottom: 10px;
      vertical-align: middle;
      background-color: #fff;
      border-radius: 4px;
      border: 1px solid #ebeef5;
      font-size: 18px;
      box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
      text-align: left;
      overflow: hidden;
      backface-visibility: hidden;
    }
    
    .zypx-message-box__header {
      position: relative;
      padding: 15px 15px 10px;
    }
    .zypx-message-box__title {
      padding-left: 0;
      margin-bottom: 0;
      font-size: 18px;
      line-height: 1;
      color: #303133;
    }
    .zypx-message-box__headerbtn {
      position: absolute;
      top: 15px;
      right: 15px;
      padding: 0;
      border: none;
      outline: none;
      background: transparent;
      font-size: 16px;
      cursor: pointer;
      color: #aaa;
      font-weight: bold;
    }
    .zypx-message-box__headerbtn:hover {
      color: #409eff;
    }
    .zypx-message-box__content {
      padding: 10px 15px;
      color: #606266;
      font-size: 14px;
    }
    .zypx-message-box__btns {
      padding: 5px 15px 0;
      text-align: right;
    }
    
    .zypx-button {
      display: inline-block;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      background: #fff;
      border: 1px solid #dcdfe6;
      -webkit-appearance: none;
      text-align: center;
      box-sizing: border-box;
      outline: none;
      margin: 0;
      transition: .1s;
      font-weight: 500;
      padding: 9px 15px;
      font-size: 12px;
      border-radius: 3px;
      color: #fff;
      background-color: #409eff;
      border-color: #409eff;
    }
    
    .zypx-input {
      position: relative;
      font-size: 14px;
      display: inline-block;
      width: 100%;
    }
    .zypx-input__inner {
      -webkit-appearance: none;
      background-color: #fff;
      background-image: none;
      border-radius: 4px;
      border: 1px solid #dcdfe6;
      box-sizing: border-box;
      color: #606266;
      display: inline-block;
      font-size: inherit;
      height: 40px;
      line-height: 40px;
      outline: none;
      padding: 0 15px;
      transition: border-color .2s cubic-bezier(.645,.045,.355,1);
      width: 100%;
    }
    .zypx-input__inner:hover {
      border: 1px solid #409eff;
    }
    
    .zypx-alert {
      width: 100%;
      padding: 8px 16px;
      margin: 0 0 15px;
      box-sizing: border-box;
      border-radius: 4px;
      position: relative;
      background-color: #e6a23c;
      color: #fff;
      overflow: hidden;
      opacity: 1;
      display: flex;
      align-items: center;
      transition: opacity .2s;
      font-size: 12px;
    }
    .zypx-tip-box {
      height: 24px;
      line-height: 24px;
      color: red;
      font-size: 12px;
    }
    .zypx-tip-box__text {
      visibility: hidden;
    }`
})()