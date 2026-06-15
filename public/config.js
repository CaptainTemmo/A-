/**
 * 前端运行时配置文件
 * 部署后可以直接修改此文件，无需重新构建
 * 修改后刷新浏览器即可生效
 */
window.__APP_CONFIG__ = {
  /**
   * 后端 API 地址
   * 如果你部署到了国内服务器，请改为你的服务器公网 IP 或域名
   *
   * 示例:
   *   "https://api.example.com"     // 有域名 + HTTPS
   *   "http://123.45.67.89:3000"    // 直接用 IP 访问
   *   "http://123.45.67.89"         // 用 Nginx 反代 80 端口
   *   ""                            // 空值时使用当前域名，适合同服务器部署前后端
   */
  API_BASE_URL: "",

  /**
   * API 密钥（可选，用于手动触发任务）
   * 如果后端设置了 API_SECRET_KEY，填入对应的值
   * 留空也可以使用（只是无法手动触发推荐生成）
   */
  API_SECRET_KEY: "",

  /**
   * 是否显示调试信息
   */
  DEBUG: false,

  /**
   * 默认选股策略
   */
  DEFAULT_STRATEGY: "multi_factor",

  /**
   * 可用策略列表
   */
  STRATEGIES: [
    { type: "multi_factor", name: "多因子" },
    { type: "momentum", name: "动量策略" },
    { type: "value", name: "价值投资" },
    { type: "quality", name: "质量因子" },
    { type: "growth", name: "成长策略" },
    { type: "reverse", name: "反转策略" },
    { type: "trend", name: "趋势跟踪" },
    { type: "fund_flow", name: "资金流向" },
    { type: "volatility", name: "波动率" }
  ]
};
