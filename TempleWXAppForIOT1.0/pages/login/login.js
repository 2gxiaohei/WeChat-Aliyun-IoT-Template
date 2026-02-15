// pages/login/login.js
Page({
  /* 数据域 */
  data: {
    isLogin: true,          // true 显示“登录” false 显示“注册”
    title: '登录'
  },

  /* 生命周期 */
  onLoad() { },

  /* 按钮事件 */
  // 登录按钮
  handleLogin() {
    // 这里需要和后端配合先做账号校验，通过后再跳转
    wx.switchTab({
      url: '/pages/index/index'   // tabBar 第一个页面
    });
  },

  // 注册按钮
  handleReg() {
    this.setData({
      isLogin: false,
      title: '注册'
    });
    // TODO: 后续可切换输入框（如增加“确认密码”等）
  },

  /* 返回登录 */
  backToLogin() {
    this.setData({
      isLogin: true,
      title: '登录'
    });
  }
});