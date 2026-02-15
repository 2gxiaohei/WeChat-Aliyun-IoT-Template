// pages/index/index.js
const app = getApp();

Page({
  data: {
    connectionStatus: '连接中...',
    receivedMessages: [],
    isTesting: false,
    testTimer: null,
    countdown: 30,
    testStatus: ''
  },

  onLoad: function() {
    this.pageId = 'pages/index/index';
    app.subscribeMessage(this.pageId, this.handleMessage.bind(this));
    
    // 检查连接状态
    this.checkConnectionStatusWithValidation();
    
    // 恢复测试状态
    this.restoreTestState();
    
    // 获取离线期间的消息
    app.broadcastOfflineMessages(this.pageId);
  },

  onUnload() {
    // 取消消息订阅
    app.unsubscribeMessage(this.pageId);
    this.saveTestState();
    this.clearTestTimer();
  },

  onHide() {
    this.saveTestState();
    this.clearTestTimer();
  },

  onShow() {
    // 重新订阅消息（防止意外取消）
    if (!app.messageSubscribers.has(this.pageId)) {
      app.subscribeMessage(this.pageId, this.handleMessage.bind(this));
    }
    
    this.checkConnectionStatusWithValidation();
    this.restoreTestState();
  },

  // 检查连接状态并进行验证
  checkConnectionStatusWithValidation() {
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        if (networkType === 'none') {
          wx.showModal({
            title: '测试界面消息',
            content: '网络错误',
            showCancel: false,
          });
          this.setData({
            connectionStatus: '网络错误'
          });
          return;
        }
        
        if (!app.globalData.isConnected) {
          wx.showModal({
            title: '测试界面消息',
            content: '阿里云连接失败',
            showCancel: false,
          });
          this.setData({
            connectionStatus: '阿里云连接失败'
          });
        } else {
          this.setData({
            connectionStatus: '已连接'
          });
        }
      },
      fail: (error) => {
        console.error('获取网络类型失败:', error);
        wx.showModal({
          title: '测试界面消息',
          content: '网络状态检测失败',
          showCancel: false,
        });
        this.setData({
          connectionStatus: '网络检测失败'
        });
      }
    });
  },

  // 原有的检查连接状态方法
  checkConnectionStatus() {
    this.setData({
      connectionStatus: app.globalData.isConnected ? '已连接' : '未连接'
    });
  },

  // 保存测试状态到全局
  saveTestState() {
    app.globalData.testState = {
      isTesting: this.data.isTesting,
      countdown: this.data.countdown,
      testStatus: this.data.testStatus,
      testStartTime: this.data.isTesting ? Date.now() : null
    };
  },

  // 恢复测试状态
  restoreTestState() {
    const testState = app.globalData.testState;
    
    if (testState && testState.isTesting) {
      if (testState.testStartTime) {
        const elapsed = Math.floor((Date.now() - testState.testStartTime) / 1000);
        const remaining = Math.max(0, testState.countdown - elapsed);
        
        if (remaining > 0) {
          this.setData({
            isTesting: true,
            countdown: remaining,
            testStatus: testState.testStatus || `测试请求已发送，等待响应... 剩余${remaining}秒`
          });
          this.startTestCountdown();
        } else {
          this.setData({
            isTesting: false,
            countdown: 30,
            testStatus: ''
          });
        }
      } else {
        this.setData({
          isTesting: testState.isTesting,
          countdown: testState.countdown,
          testStatus: testState.testStatus
        });
        if (testState.isTesting) {
          this.startTestCountdown();
        }
      }
    }
  },

  handleMessage(message) {
    console.log('index页面收到消息:', message);
    
    try {
      const messageData = JSON.parse(message.payload);
      
      // 如果正在测试中且收到 {"status": "connecttestok"}
      if (this.data.isTesting && messageData.status === 'connecttestok') {
        this.clearTestTimer();
        this.setData({
          isTesting: false,
          countdown: 30,
          testStatus: ''
        });
        
        this.saveTestState();
        
        wx.showModal({
          title: '测试界面消息',
          content: '设备连接正常',
          showCancel: false,
          confirmText: '确定',
          success: (res) => {
            if (res.confirm) {
              console.log('用户点击确定');
            }
          }
        });
      }
      
      // 更新接收到的消息列表
      const newMessages = this.data.receivedMessages.concat([message]);
      this.setData({
        receivedMessages: newMessages
      });
      
    } catch (error) {
      console.error('解析消息失败:', error);
      const newMessages = this.data.receivedMessages.concat([message]);
      this.setData({
        receivedMessages: newMessages
      });
    }
  },

  // 清除测试计时器
  clearTestTimer() {
    if (this.data.testTimer) {
      clearInterval(this.data.testTimer);
      this.setData({
        testTimer: null
      });
    }
  },

  // 开始测试倒计时
  startTestCountdown() {
    this.clearTestTimer();

    const timer = setInterval(() => {
      const newCountdown = this.data.countdown - 1;
      
      if (newCountdown <= 0) {
        this.clearTestTimer();
        this.setData({
          isTesting: false,
          countdown: 30,
          testStatus: ''
        });
        
        this.saveTestState();
        
        wx.showModal({
          title: '测试失败',
          content: '设备连接测试失败，请重试',
          showCancel: false,
          confirmText: '确定'
        });
        return;
      }
      
      this.setData({
        countdown: newCountdown,
        testStatus: `测试请求已发送，等待响应... 剩余${newCountdown}秒`
      });
      
      this.saveTestState();
      
    }, 1000);

    this.setData({
      testTimer: timer
    });
  },

  onClickConnecTest() {
    if (this.data.isTesting) {
      wx.showToast({
        title: '测试进行中，请稍候',
        icon: 'none'
      });
      return;
    }

    if (!app.globalData.isConnected) {
      wx.showModal({
        title: '测试界面消息',
        content: '网络连接异常，请检查网络连接后重试',
        showCancel: false,
        confirmText: '确定'
      });
      return;
    }

    const message = { status: 'connecttest' }; 
    const success = app.publishMessage(
      app.globalData.config.aliyun.pubTopic, 
      JSON.stringify(message)
    );
    
    if (success) {
      this.setData({
        isTesting: true,
        countdown: 30,
        testStatus: '测试请求已发送，等待响应... 剩余30秒'
      });
      
      this.startTestCountdown();
      this.saveTestState();
    } else {
      this.setData({
        testStatus: '发送失败，请检查连接'
      });
      
      wx.showToast({
        title: '发送失败',
        icon: 'error'
      });
      
      setTimeout(() => {
        if (!this.data.isTesting) {
          this.setData({
            testStatus: ''
          });
        }
      }, 3000);
    }
  },

  // 清空消息列表
  clearMessages() {
    this.setData({
      receivedMessages: []
    });
    wx.showToast({
      title: '消息已清空',
      icon: 'success'
    });
  },

  // 复制消息内容
  copyMessage(e) {
    const index = e.currentTarget.dataset.index;
    const message = this.data.receivedMessages[index];
    
    wx.setClipboardData({
      data: JSON.stringify(message, null, 2),
      success: () => {
        wx.showToast({
          title: '消息已复制',
          icon: 'success'
        });
      }
    });
  }
});