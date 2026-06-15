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

  d.exec(`
    CREATE TABLE IF NOT EXISTS daily_recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_date TEXT NOT NULL,
      strategy_type TEXT DEFAULT 'multi_factor',
      strategy_name TEXT DEFAULT '多因子',
      created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
      next_trading_day TEXT,

      main_chinext TEXT NOT NULL DEFAULT '[]',
      star TEXT NOT NULL DEFAULT '[]',
      bse TEXT NOT NULL DEFAULT '[]',

      total_count INTEGER DEFAULT 0,
      provider TEXT DEFAULT '东方财富',
      status TEXT DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS idx_recommendations_date ON daily_recommendations(trade_date DESC);
    CREATE INDEX IF NOT EXISTS idx_recommendations_strategy ON daily_recommendations(strategy_type);
  `);

  d.exec(`
    CREATE TABLE IF NOT EXISTS daily_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_date TEXT NOT NULL UNIQUE,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),

      review_data TEXT NOT NULL DEFAULT '{}',

      recommendation_id INTEGER,
      FOREIGN KEY (recommendation_id) REFERENCES daily_recommendations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_date ON daily_reviews(trade_date DESC);
  `);

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

function saveRecommendations(tradeDate, nextTradingDay, mainChinext, star, bse, strategyType = 'multi_factor', strategyName = '多因子') {
  const d = getDb();

  const totalCount = mainChinext.length + star.length + bse.length;

  const stmt = d.prepare(`
    INSERT INTO daily_recommendations 
    (trade_date, strategy_type, strategy_name, next_trading_day, main_chinext, star, bse, total_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    tradeDate,
    strategyType,
    strategyName,
    JSON.stringify(nextTradingDay),
    JSON.stringify(mainChinext),
    JSON.stringify(star),
    JSON.stringify(bse),
    totalCount
  );
  
  return result.lastInsertRowid;
}

function getLatestRecommendation(strategyType = null) {
  const d = getDb();
  let row;
  
  if (strategyType) {
    row = d.prepare(`
      SELECT * FROM daily_recommendations 
      WHERE strategy_type = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(strategyType);
  } else {
    row = d.prepare(`
      SELECT * FROM daily_recommendations ORDER BY created_at DESC LIMIT 1
    `).get();
  }
  
  if (!row) return null;
  return {
    ...row,
    main_chinext: JSON.parse(row.main_chinext || '[]'),
    star: JSON.parse(row.star || '[]'),
    bse: JSON.parse(row.bse || '[]'),
    next_trading_day: row.next_trading_day,
  };
}

function getLatestRecommendations() {
  const d = getDb();
  const rows = d.prepare(`
    SELECT DISTINCT strategy_type, strategy_name 
    FROM daily_recommendations 
    ORDER BY strategy_type
  `).all();
  
  const results = [];
  for (const row of rows) {
    const rec = getLatestRecommendation(row.strategy_type);
    if (rec) {
      results.push(rec);
    }
  }
  
  return results;
}

function getRecommendationByDate(tradeDate, strategyType = null) {
  const d = getDb();
  let row;
  
  if (strategyType) {
    row = d.prepare('SELECT * FROM daily_recommendations WHERE trade_date = ? AND strategy_type = ?').get(tradeDate, strategyType);
  } else {
    row = d.prepare('SELECT * FROM daily_recommendations WHERE trade_date = ?').get(tradeDate);
  }
  
  if (!row) return null;
  return {
    ...row,
    main_chinext: JSON.parse(row.main_chinext || '[]'),
    star: JSON.parse(row.star || '[]'),
    bse: JSON.parse(row.bse || '[]'),
  };
}

function getLatestReview() {
  const d = getDb();
  const row = d.prepare('SELECT * FROM daily_reviews ORDER BY reviewed_at DESC LIMIT 1').get();
  if (!row) return null;
  return {
    ...row,
    review_data: JSON.parse(row.review_data || '{}'),
  };
}

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

function markRecommendationReviewed(tradeDate) {
  const d = getDb();
  d.prepare(`UPDATE daily_recommendations SET status = 'reviewed' WHERE trade_date = ?`).run(tradeDate);
}

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
  getLatestRecommendations,
  getRecommendationByDate,
  saveReview,
  getLatestReview,
  markRecommendationReviewed,
  saveNews,
  getNewsInRange,
  getRecommendationsInRange,
};
