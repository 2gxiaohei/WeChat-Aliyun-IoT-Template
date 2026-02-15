// config.js - 统一配置文件
const config = {
  // 阿里云配置：请登录阿里云平台查看并在下方补全
  aliyun: {
    productKey: '填写你的产品密钥',      // 产品唯一标识（在"产品详情"页查看）
    deviceName: '填写你的设备名称',       // 设备名称（在"设备列表"中查看）
    deviceSecret: '填写你的设备密钥',      // 设备密钥（创建设备时生成，请妥善保管）
    regionId: '填写服务地域ID',           // 服务地域（通常可以用cn-shanghai等）
    pubTopic: '填写发布消息的主题',        // 小程序发布消息给设备的Topic
    subTopic: '填写订阅消息的主题',        // 小程序接收设备消息的Topic
  },
  
  // 应用配置
  app: {
    name: '物联网小程序模板',
    version: '1.0.0'
  }
};

module.exports = config;