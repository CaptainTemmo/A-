'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/stocks.db');

let db = null;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const d = getDb();

  // 每日推荐记录
  d.exec(`
    CREATE TABLE IF NOT EXISTS daily_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_date TEXT NOT NULL,          -- 推荐对应的目标交易日, 格式 YYYY-MM-DD
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      next_trading_day TEXT,            -- 下一个交易日

      -- 主板+创业板推荐 (JSON 数组 of stock objects)
      main_chinext TEXT NOT NULL DEFAULT '[]',
      -- 科创板推荐
      star TEXT NOT NULL DEFAULT '[]',
      -- 北交所推荐
      bse TEXT NOT NULL DEFAULT '[]',

      -- 元信息
      total_count INTEGER DEFAULT 0,
      provider TEXT DEFAULT '东方财富',
      status TEXT DEFAULT 'pending'       -- pending | reviewed | archived
    );

    CREATE INDEX IF NOT EXISTS idx_recommendations_date ON daily_recommendations(trade_date DESC);
  `);

  // 每日复盘记录
  d.exec(`
    CREATE TABLE IF NOT EXISTS daily_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_date TEXT NOT NULL UNIQUE,  -- 被复盘的交易日
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

      -- 复盘数据 (JSON)
      review_data TEXT NOT NULL DEFAULT '{}',

      -- 关联的推荐 ID
      recommendation_id INTEGER,
      FOREIGN KEY (recommendation_id) REFERENCES daily_recommendations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_date ON daily_reviews(trade_date DESC);
  `);

  // 新闻缓存 (避免重复爬取)
  d.exec(`
    CREATE TABLE IF NOT EXISTS news_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      published_at TEXT,
      title TEXT NOT NULL,
      content TEXT,
      source TEXT,
      url TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

      UNIQUE(stock_code, title, published_at)
    );

    CREATE INDEX IF NOT EXISTS idx_news_code ON news_cache(stock_code);
    CREATE INDEX IF NOT EXISTS idx_news_published ON news_cache(published_at);
  `);
}

/**
 * 保存某日的推荐
 */
function saveRecommendations(tradeDate, nextTradingDay, mainChinext, star, bse) {
  const d = getDb();
  const existing = d.prepare('SELECT id FROM daily_recommendations WHERE trade_date = ?').get(tradeDate);

  const totalCount = mainChinext.length + star.length + bse.length;

  if (existing) {
    const stmt = d.prepare(`
      UPDATE daily_recommendations
      SET next_trading_day = ?, main_chinext = ?, star = ?, bse = ?,
          total_count = ?, status = 'pending', created_at = datetime('now', '+8 hours')
      WHERE trade_date = ?
    `);
    stmt.run(
      JSON.stringify(nextTradingDay),
      JSON.stringify(mainChinext),
      JSON.stringify(star),
      JSON.stringify(bse),
      totalCount,
      tradeDate
    );
    return existing.id;
  } else {
    const stmt = d.prepare(`
      INSERT INTO daily_recommendations (trade_date, next_trading_day, main_chinext, star, bse, total_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      tradeDate,
      JSON.stringify(nextTradingDay),
      JSON.stringify(mainChinext),
      JSON.stringify(star),
      JSON.stringify(bse),
      totalCount
    );
    return result.lastInsertRowid;
  }
}

/**
 * 获取最新一条推荐
 */
function getLatestRecommendation() {
  const d = getDb();
  const row = d.prepare(`
    SELECT * FROM daily_recommendations ORDER BY created_at DESC LIMIT 1
  `).get();
  if (!row) return null;
  return {
    ...row,
    main_chinext: JSON.parse(row.main_chinext || '[]'),
    star: JSON.parse(row.star || '[]'),
    bse: JSON.parse(row.bse || '[]'),
    next_trading_day: row.next_trading_day,
  };
}

/**
 * 获取某日的推荐
 */
function getRecommendationByDate(tradeDate) {
  const d = getDb();
  const row = d.prepare('SELECT * FROM daily_recommendations WHERE trade_date = ?').get(tradeDate);
  if (!row) return null;
  return {
    ...row,
    main_chinext: JSON.parse(row.main_chinext || '[]'),
    star: JSON.parse(row.star || '[]'),
    bse: JSON.parse(row.bse || '[]'),
  };
}

/**
 * 获取最新一条复盘
 */
function getLatestReview() {
  const d = getDb();
  const row = d.prepare('SELECT * FROM daily_reviews ORDER BY reviewed_at DESC LIMIT 1').get();
  if (!row) return null;
  return {
    ...row,
    review_data: JSON.parse(row.review_data || '{}'),
  };
}

/**
 * 保存复盘
 */
function saveReview(tradeDate, reviewData, recommendationId) {
  const d = getDb();
  const existing = d.prepare('SELECT id FROM daily_reviews WHERE trade_date = ?').get(tradeDate);

  if (existing) {
    const stmt = d.prepare(`
      UPDATE daily_reviews SET review_data = ?, reviewed_at = datetime('now', '+8 hours')
      WHERE trade_date = ?
    `);
    stmt.run(JSON.stringify(reviewData), tradeDate);
    return existing.id;
  } else {
    const stmt = d.prepare(`
      INSERT INTO daily_reviews (trade_date, review_data, recommendation_id)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(tradeDate, JSON.stringify(reviewData), recommendationId || null);
    return result.lastInsertRowid;
  }
}

/**
 * 标记推荐为已复盘
 */
function markRecommendationReviewed(tradeDate) {
  const d = getDb();
  d.prepare(`UPDATE daily_recommendations SET status = 'reviewed' WHERE trade_date = ?`).run(tradeDate);
}

/**
 * 保存新闻
 */
function saveNews(stockCode, news) {
  if (!news || !news.length) return;
  const d = getDb();
  const stmt = d.prepare(`
    INSERT OR IGNORE INTO news_cache (stock_code, published_at, title, content, source, url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const n of news) {
    stmt.run(stockCode, n.published_at || null, n.title || '', n.content || '', n.source || '', n.url || '');
  }
}

/**
 * 获取某段时间内的新闻
 */
function getNewsInRange(stockCodes, startDate, endDate) {
  if (!stockCodes || stockCodes.length === 0) return {};
  const placeholders = stockCodes.map(() => '?').join(',');
  const d = getDb();
  const rows = d.prepare(`
    SELECT * FROM news_cache
    WHERE stock_code IN (${placeholders})
      AND published_at BETWEEN ? AND ?
    ORDER BY published_at DESC
  `).all(...stockCodes, startDate, endDate);

  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.stock_code]) grouped[r.stock_code] = [];
    grouped[r.stock_code].push(r);
  }
  return grouped;
}

/**
 * 获取指定日期区间的推荐
 */
function getRecommendationsInRange(startDate, endDate) {
  const d = getDb();
  const rows = d.prepare(`
    SELECT * FROM daily_recommendations
    WHERE trade_date BETWEEN ? AND ?
    ORDER BY trade_date DESC
  `).all(startDate, endDate);
  return rows.map(row => ({
    ...row,
    main_chinext: JSON.parse(row.main_chinext || '[]'),
    star: JSON.parse(row.star || '[]'),
    bse: JSON.parse(row.bse || '[]'),
  }));
}

module.exports = {
  getDb,
  saveRecommendations,
  getLatestRecommendation,
  getRecommendationByDate,
  saveReview,
  getLatestReview,
  markRecommendationReviewed,
  saveNews,
  getNewsInRange,
  getRecommendationsInRange,
};
