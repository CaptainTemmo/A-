'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { taskGenerateRecommendations, taskReview } = require('../scheduler/tasks');
const { STRATEGY_LABELS, STRATEGY_DESCRIPTIONS } = require('../services/recommender');

// GET /api/recommendations/latest - 获取最新推荐（支持按策略筛选）
router.get('/recommendations/latest', async (req, res) => {
  try {
    const strategyType = req.query.strategy || null;
    const rec = db.getLatestRecommendation(strategyType);
    
    if (!rec) {
      return res.json({ success: false, message: '暂无推荐数据' });
    }

    const latestReview = db.getLatestReview();

    res.json({
      success: true,
      data: {
        recommendation: rec,
        review: latestReview || null,
      },
      meta: {
        generatedAt: rec.created_at,
        nextTradingDay: rec.next_trading_day,
        totalCount: rec.total_count,
        status: rec.status,
        strategyType: rec.strategy_type,
        strategyName: rec.strategy_name,
      }
    });
  } catch (err) {
    console.error('[API] GET /recommendations/latest 失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/recommendations/all - 获取所有策略的最新推荐
router.get('/recommendations/all', async (req, res) => {
  try {
    const recs = db.getLatestRecommendations();
    if (!recs || recs.length === 0) {
      return res.json({ success: false, message: '暂无推荐数据' });
    }
    res.json({ success: true, data: recs });
  } catch (err) {
    console.error('[API] GET /recommendations/all 失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/recommendations/history - 获取历史推荐
router.get('/recommendations/history', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const strategyType = req.query.strategy || null;
    
    const d = db.getDb();
    let rows;
    
    if (strategyType) {
      rows = d.prepare(`
        SELECT trade_date, next_trading_day, total_count, status, created_at, strategy_type, strategy_name
        FROM daily_recommendations
        WHERE strategy_type = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(strategyType, limit);
    } else {
      rows = d.prepare(`
        SELECT trade_date, next_trading_day, total_count, status, created_at, strategy_type, strategy_name
        FROM daily_recommendations
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[API] GET /recommendations/history 失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/recommendations/:date - 获取指定日期推荐
router.get('/recommendations/:date', (req, res) => {
  try {
    const strategyType = req.query.strategy || null;
    const rec = db.getRecommendationByDate(req.params.date, strategyType);
    if (!rec) {
      return res.status(404).json({ success: false, message: `未找到 ${req.params.date} 的推荐` });
    }
    res.json({ success: true, data: rec });
  } catch (err) {
    console.error('[API] GET /recommendations/:date 失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/strategies - 获取所有可用策略列表
router.get('/strategies', (req, res) => {
  try {
    const strategies = Object.entries(STRATEGY_LABELS).map(([key, label]) => ({
      type: key,
      name: label,
      description: STRATEGY_DESCRIPTIONS[key] || '',
    }));
    res.json({ success: true, data: strategies });
  } catch (err) {
    console.error('[API] GET /strategies 失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews/latest - 获取最新复盘
router.get('/reviews/latest', (req, res) => {
  try {
    const review = db.getLatestReview();
    if (!review) {
      return res.json({ success: false, message: '暂无复盘数据' });
    }
    res.json({ success: true, data: review });
  } catch (err) {
    console.error('[API] GET /reviews/latest 失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/generate - 手动触发生成推荐（需密钥保护）
router.post('/tasks/generate', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  const expectedKey = process.env.API_SECRET_KEY || 'dev-secret-key';

  if (apiKey !== expectedKey) {
    return res.status(401).json({ success: false, message: '未授权' });
  }

  try {
    await taskGenerateRecommendations();
    res.json({ success: true, message: '推荐生成任务已触发' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/review - 手动触发复盘
router.post('/tasks/review', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  const expectedKey = process.env.API_SECRET_KEY || 'dev-secret-key';

  if (apiKey !== expectedKey) {
    return res.status(401).json({ success: false, message: '未授权' });
  }

  try {
    await taskReview();
    res.json({ success: true, message: '复盘任务已触发' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/health - 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.1.0',
  });
});

module.exports = router;
