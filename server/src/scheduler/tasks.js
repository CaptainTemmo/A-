'use strict';

const { CronJob } = require('cron');
const { generateRecommendations, reviewRecommendations, getNextTradingDay, getPrevTradingDay } = require('../services/recommender');
const { fetchBatchNews, fetchQuotes } = require('../services/eastmoney');
const db = require('../db/database');

// 中国时区 (UTC+8)
const TZ = 'Asia/Shanghai';

/**
 * 检查是否为交易日 (简单判断：非周末)
 * 完整节假日需要维护一个节假日表或调用外部 API
 */
function isTradingDayNow() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
  // 工作日 9:00-15:30 视为交易日
  return h >= 9 && h < 16;
}

function isWeekend(d) {
  return d.getDay() === 0 || d.getDay() === 6;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekday = '日一二三四五六'[d.getDay()];
  return `${y}-${m}-${day}`;
}

/**
 * 每日收盘后 (15:10) 生成下一交易日推荐
 */
async function taskGenerateRecommendations() {
  console.log(`[定时任务] ${new Date().toISOString()} - 开始执行「生成推荐」任务`);

  try {
    const result = await generateRecommendations(10);

    // 保存到数据库
    const nextDayIso = result.nextTradingDayIso;
    const savedId = db.saveRecommendations(
      nextDayIso,
      result.nextTradingDay,
      result.boards.main_chinext,
      result.boards.star,
      result.boards.bse
    );

    console.log(`[定时任务] 推荐已保存到数据库, ID: ${savedId}, 目标日: ${result.nextTradingDay}`);
    console.log(`  - 主板+创业板: ${result.summary.main_chinext_count} 只`);
    console.log(`  - 科创板: ${result.summary.star_count} 只`);
    console.log(`  - 北交所: ${result.summary.bse_count} 只`);
  } catch (err) {
    console.error('[定时任务] 「生成推荐」任务失败:', err);
  }
}

/**
 * 每日收盘后 (15:20) 复盘当日行情
 */
async function taskReview() {
  console.log(`[定时任务] ${new Date().toISOString()} - 开始执行「复盘」任务`);

  try {
    // 获取当前推荐的上一交易日
    const latestRec = db.getLatestRecommendation();
    if (!latestRec) {
      console.log('[定时任务] 无推荐数据可复盘，等待下一轮');
      return;
    }

    // 推荐日对应的"上一个交易日"应该是今天（如果今天已收盘）
    const today = formatDate(new Date());
    const prevDayIso = latestRec.trade_date; // 推荐的交易日本身就是"上一个交易日"

    console.log(`[定时任务] 复盘日期: ${prevDayIso}, 推荐目标日: ${latestRec.trade_date}`);

    const allStocks = [
      ...(latestRec.main_chinext || []),
      ...(latestRec.star || []),
      ...(latestRec.bse || []),
    ];

    // 获取新闻（在 T-1 收盘到 T 收盘之间）
    // 复盘时: 获取从 prevDay 15:00 到 today 15:00 的新闻
    const newsStart = `${prevDayIso} 15:00:00`;
    const newsEnd = `${today} 15:00:00`;
    console.log(`[定时任务] 获取新闻区间: ${newsStart} ~ ${newsEnd}`);

    // 先尝试从数据库获取缓存新闻，如果没有则爬取
    let allNews = db.getNewsInRange(
      allStocks.map(s => s.code),
      newsStart,
      newsEnd
    );

    // 爬取缺失的新闻
    const fetchedNews = await fetchBatchNews(
      allStocks.map(s => s.code),
      10
    );

    // 保存爬取的新闻到数据库
    for (const [code, news] of Object.entries(fetchedNews)) {
      if (news && news.length) {
        db.saveNews(code, news);
      }
    }

    // 合并：优先用缓存，补充爬取的
    const mergedNews = {};
    for (const stock of allStocks) {
      mergedNews[stock.code] = [
        ...(allNews[stock.code] || []),
        ...(fetchedNews[stock.code] || []),
      ].slice(0, 15);
    }

    // 执行复盘
    const review = await reviewRecommendations(latestRec);
    review.news = mergedNews;

    // 注入新闻分析
    for (const item of review.items) {
      const newsForStock = mergedNews[item.code] || [];
      if (newsForStock.length > 0) {
        const keyNews = newsForStock.slice(0, 3);
        item.relevantNews = keyNews.map(n => ({
          title: n.title,
          time: n.published_at,
          source: n.source,
        }));
        // 在分析中加入新闻影响
        if (item.verdict === 'miss' && keyNews.length > 0) {
          item.analysis += ` 期间相关新闻: "${keyNews[0].title}"，可能对股价走势产生了影响。`;
        }
      }
    }

    // 保存复盘结果
    db.saveReview(prevDayIso, review, latestRec.id);
    db.markRecommendationReviewed(prevDayIso);

    console.log(`[定时任务] 复盘完成: 命中率 ${review.hitRate}, 胜率 ${review.beatRate}`);
  } catch (err) {
    console.error('[定时任务] 「复盘」任务失败:', err);
  }
}

/**
 * 注册所有定时任务
 */
function registerTasks() {
  // 每天 15:10 (收盘后 10 分钟) 生成下一交易日推荐
  const jobRecommend = new CronJob(
    '10 15 * * 1-5', // UTC 时间, = 北京时间 15:10, 周一至周五
    taskGenerateRecommendations,
    null,
    true,
    TZ
  );

  // 每天 15:25 (收盘后 25 分钟) 执行复盘
  const jobReview = new CronJob(
    '25 15 * * 1-5', // UTC 时间, = 北京时间 15:25, 周一至周五
    taskReview,
    null,
    true,
    TZ
  );

  // 每天 09:05 (开盘后 5 分钟) 也生成一次推荐（备用）
  const jobMorning = new CronJob(
    '5 9 * * 1-5', // UTC 时间, = 北京时间 09:05
    taskGenerateRecommendations,
    null,
    true,
    TZ
  );

  console.log('[调度器] 定时任务已注册:');
  console.log('  - 每天 09:05 (UTC+8): 生成/更新当日推荐（备用）');
  console.log('  - 每天 15:10 (UTC+8): 生成下一交易日推荐');
  console.log('  - 每天 15:25 (UTC+8): 执行复盘');

  return { jobRecommend, jobReview, jobMorning };
}

module.exports = { registerTasks, taskGenerateRecommendations, taskReview };
