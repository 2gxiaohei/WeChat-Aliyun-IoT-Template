// pages/message/message.js
const app = getApp();

Page({
  data: {
    msgList: []
  },

  onLoad() {
    this.app = app;
    this.pageId = 'pages/message/message';
    this.app.subscribeMessage(this.pageId, this.handleAliyunMessage.bind(this));

    // 显示连接状态
    if (this.app.globalData.isConnected) {
      this.pushSystemMsg("微信小程序连接云平台成功");
    } else {
      this.pushSystemMsg("正在连接云平台...");
    }

    this.showOfflineMessages();
  },

  onUnload() {
    this.app?.unsubscribeMessage(this.pageId);
  },

  onShow() {
    if (!this.app.messageSubscribers.has(this.pageId)) {
      this.app.subscribeMessage(this.pageId, this.handleAliyunMessage.bind(this));
    }
  },

  /* ========== 消息处理核心 ========== */
  handleAliyunMessage(message) {
    console.log("message页面收到消息:", message);
    this.processMessagePayload(message.payload, message.timestamp);
  },

  processMessagePayload(payload, timestamp) {
    try {
      console.log("解析消息payload:", payload);
      const parsedMsg = typeof payload === 'string' ? JSON.parse(payload) : payload;

      // 1. 连接测试成功消息（特殊处理）
      if (parsedMsg.status === 'connecttestok') {
        this.pushSystemMsg("小程序连接云平台测试成功", timestamp);
        return;
      }

      // 2. 提取并显示消息内容（message字段）
      const msgContent = parsedMsg.message;
      if (msgContent) {
        this.pushMsg(`收到消息: ${msgContent}`, timestamp, {
          type: 'parsed',
          original: parsedMsg
        });
        return;
      }

      // 3. 无法解析的消息
      this.pushMsg(`收到无法解析的消息: ${JSON.stringify(parsedMsg)}`, timestamp, {
        type: 'unparsed',
        original: parsedMsg
      });

    } catch (error) {
      console.error("消息解析错误:", error);
      this.pushMsg(`收到无法解析的消息: ${payload}`, timestamp, { type: 'unparsed' });
    }
  },
  /* ============================= */

  /* ========== 消息展示 ========== */
  pushSystemMsg(content, timestamp) {
    this.pushMsg(content, timestamp, { type: 'system' });
  },

  pushMsg(content, timestamp, meta = {}) {
    const date = timestamp ? new Date(timestamp) : new Date();
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

    // 根据消息类型设置样式
    const typeClass = {
      system: ' system-msg',
      parsed: ' parsed-msg',
      unparsed: ' unparsed-msg'
    }[meta.type] || '';

    this.data.msgList.unshift({
      id: Date.now() + Math.random(),
      time: timeStr,
      content,
      class: 'item' + typeClass,
      meta
    });

    // 限制消息数量
    if (this.data.msgList.length > 200) {
      this.data.msgList = this.data.msgList.slice(0, 200);
    }
    this.setData({ msgList: this.data.msgList });
  },
  /* ============================= */

  /* ========== 消息管理 ========== */
  confirmClearAll() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有消息吗？此操作不可恢复',
      confirmColor: '#ff4d4f',
      success: (res) => res.confirm && this.clearAllMessages()
    });
  },

  clearAllMessages() {
    this.setData({ msgList: [] });
    wx.showToast({ title: '已清除所有消息', icon: 'success', duration: 1500 });
  },

  showOfflineMessages() {
    const offlineMessages = this.app.getOfflineMessages();
    if (offlineMessages?.length) {
      offlineMessages.forEach(msg => this.processMessagePayload(msg.payload, msg.timestamp));
      this.app.clearOfflineMessages();
    }
  }
  /* ============================= */
});