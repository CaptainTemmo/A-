'use strict';

const express = require('express');
const path = require('path');
const { registerTasks } = require('./scheduler/tasks');
const apiRouter = require('./routes/api');

const PORT = process.env.PORT || 3000;
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS（允许前端跨域访问）
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// API 路由
app.use('/api', apiRouter);

// 根路径 → 服务状态
app.get('/', (req, res) => {
  res.json({
    name: 'A股选股推荐服务',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      recommendations: '/api/recommendations/latest',
      reviews: '/api/reviews/latest',
      history: '/api/recommendations/history',
      health: '/api/health',
    },
    timestamp: new Date().toISOString(),
  });
});

// 静态文件（用于 Railway 健康检查）
app.use(express.static(path.join(__dirname, '../../public')));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由 ${req.path} 不存在` });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[错误]', err);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log('  A股选股推荐服务已启动');
  console.log(`  端口: ${PORT}`);
  console.log(`  时间: ${new Date().toISOString()}`);
  console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');

  // 注册定时任务
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    registerTasks();
    console.log('[启动] 定时任务调度器已激活');
  } else {
    console.log('[启动] 定时任务已禁用 (ENABLE_SCHEDULER=false)');
  }
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('[信号] 收到 SIGTERM，正在关闭...');
  server.close(() => {
    console.log('[信号] 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[信号] 收到 SIGINT，正在关闭...');
  server.close(() => process.exit(0));
});

module.exports = app;
