// app.js
const mqtt = require('./utils/mqtt.js');
const aliyunOpt = require('./utils/aliyun/aliyun_connect.js');
const config = require('./config.js');

App({
  globalData: {
    mqttClient: null,
    isConnected: false,
    testState: null,
    offlineMessages: [],
    config: config  // 将配置挂载到全局
  },

  // 消息订阅系统
  messageSubscribers: new Map(),

  onLaunch() {
    this.initMQTT();
  },

  initMQTT() {
    const aliyunInfo = config.aliyun;  // 从配置文件读取

    let clientOpt = aliyunOpt.getAliyunIotMqttClient({
      productKey: aliyunInfo.productKey,
      deviceName: aliyunInfo.deviceName,
      deviceSecret: aliyunInfo.deviceSecret,
      regionId: aliyunInfo.regionId,
    });

    let host = 'wxs://' + clientOpt.host;
    
    const options = {
      protocolVersion: 4,
      clean: false,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      resubscribe: true,
      clientId: clientOpt.clientId,
      password: clientOpt.password,
      username: clientOpt.username,
    };

    this.globalData.mqttClient = mqtt.connect(host, options);

    this.globalData.mqttClient.on('connect', (connack) => {
      console.log('MQTT连接成功');
      this.globalData.isConnected = true;
      
      this.globalData.mqttClient.subscribe(aliyunInfo.subTopic, (err) => {
        if (!err) {
          console.log("订阅成功");
          this.requestOfflineMessages();
        }
      });
    });

    this.globalData.mqttClient.on("message", (topic, payload) => {
      console.log("收到消息 topic:" + topic + " , payload:" + payload);
      
      try {
        const payloadStr = payload.toString();
        const message = {
          topic: topic,
          payload: payloadStr,
          timestamp: new Date().getTime()
        };
        
        this.globalData.offlineMessages.push(message);
        this.broadcastMessage(message);
        
        // 根据消息内容判断连接状态
        const parsedMsg = JSON.parse(payloadStr);
        if (parsedMsg.message === "connection_success") {
          this.globalData.isConnected = true;
        } else if (parsedMsg.message === "connection_failed") {
          this.globalData.isConnected = false;
        }
        
      } catch (error) {
        console.error("处理MQTT消息错误:", error);
      }
    });

    this.globalData.mqttClient.on("error", (error) => {
      console.log("MQTT错误:", error);
      this.globalData.isConnected = false;
    });

    this.globalData.mqttClient.on("offline", () => {
      console.log("MQTT离线");
      this.globalData.isConnected = false;
    });
  },

  // 请求离线消息
  requestOfflineMessages() {
    if (this.globalData.isConnected) {
      const requestMsg = {
        type: 'get_offline_messages',
        timestamp: new Date().getTime()
      };
      this.publishMessage(this.globalData.config.aliyun.pubTopic, JSON.stringify(requestMsg));
    }
  },

  // 发布消息方法
  publishMessage(topic, message) {
    if (this.globalData.mqttClient && this.globalData.isConnected) {
      this.globalData.mqttClient.publish(topic, message);
      return true;
    } else {
      console.warn('MQTT未连接，无法发送消息');
      return false;
    }
  },

  // ========== 消息订阅系统 ==========
  
  subscribeMessage(pageId, callback) {
    if (typeof callback === 'function') {
      this.messageSubscribers.set(pageId, callback);
      console.log(`页面 ${pageId} 订阅消息成功，当前订阅者数量: ${this.messageSubscribers.size}`);
    }
  },

  unsubscribeMessage(pageId) {
    this.messageSubscribers.delete(pageId);
    console.log(`页面 ${pageId} 取消订阅，当前订阅者数量: ${this.messageSubscribers.size}`);
  },

  broadcastMessage(message) {
    if (this.messageSubscribers.size === 0) {
      console.log('没有消息订阅者');
      return;
    }
    
    this.messageSubscribers.forEach((callback, pageId) => {
      try {
        if (typeof callback === 'function') {
          callback(message);
          console.log(`消息已发送给页面 ${pageId}`);
        }
      } catch (error) {
        console.error(`发送消息给页面 ${pageId} 时出错:`, error);
      }
    });
  },

  broadcastOfflineMessages(pageId) {
    const callback = this.messageSubscribers.get(pageId);
    if (callback && this.globalData.offlineMessages.length > 0) {
      this.globalData.offlineMessages.forEach(message => {
        try {
          callback(message);
        } catch (error) {
          console.error(`发送离线消息给页面 ${pageId} 时出错:`, error);
        }
      });
    }
  },

  getOfflineMessages() {
    return this.globalData.offlineMessages;
  },

  clearOfflineMessages() {
    this.globalData.offlineMessages = [];
  }
});