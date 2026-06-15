'use strict';

const { CronJob } = require('cron');
const { generateRecommendations, reviewRecommendations, getNextTradingDay, getPrevTradingDay, STRATEGY_LABELS } = require('../services/recommender');
const { fetchBatchNews, fetchQuotes } = require('../services/eastmoney');
const db = require('../db/database');

const TZ = 'Asia/Shanghai';

function isTradingDayNow() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
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
 * 每日收盘后 (15:10) 生成下一交易日推荐（多策略并行）
 */
async function taskGenerateRecommendations() {
  console.log(`[定时任务] ${new Date().toISOString()} - 开始执行「生成推荐」任务`);

  try {
    const strategies = ['multi_factor', 'momentum', 'value', 'quality', 'growth'];
    
    for (const strategy of strategies) {
      console.log(`[定时任务] 生成 ${STRATEGY_LABELS[strategy]} 推荐...`);
      
      const result = await generateRecommendations(strategy, 10);

      const nextDayIso = result.nextTradingDayIso;
      const savedId = db.saveRecommendations(
        nextDayIso,
        result.nextTradingDay,
        result.boards.main_chinext,
        result.boards.star,
        result.boards.bse,
        strategy,
        result.strategyName
      );

      console.log(`[定时任务] ${result.strategyName} 推荐已保存, ID: ${savedId}, 目标日: ${result.nextTradingDay}`);
      console.log(`  - 主板+创业板: ${result.summary.main_chinext_count} 只`);
      console.log(`  - 科创板: ${result.summary.star_count} 只`);
      console.log(`  - 北交所: ${result.summary.bse_count} 只`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('[定时任务] 所有策略推荐生成完成');
  } catch (err) {
    console.error('[定时任务] 「生成推荐」任务失败:', err);
  }
}

/**
 * 每日收盘后 (15:25) 复盘当日行情
 */
async function taskReview() {
  console.log(`[定时任务] ${new Date().toISOString()} - 开始执行「复盘」任务`);

  try {
    const latestRec = db.getLatestRecommendation();
    if (!latestRec) {
      console.log('[定时任务] 无推荐数据可复盘，等待下一轮');
      return;
    }

    const today = formatDate(new Date());
    const prevDayIso = latestRec.trade_date;

    console.log(`[定时任务] 复盘日期: ${prevDayIso}, 推荐目标日: ${latestRec.trade_date}`);

    const allStocks = [
      ...(latestRec.main_chinext || []),
      ...(latestRec.star || []),
      ...(latestRec.bse || []),
    ];

    const newsStart = `${prevDayIso} 15:00:00`;
    const newsEnd = `${today} 15:00:00`;
    console.log(`[定时任务] 获取新闻区间: ${newsStart} ~ ${newsEnd}`);

    let allNews = db.getNewsInRange(
      allStocks.map(s => s.code),
      newsStart,
      newsEnd
    );

    const fetchedNews = await fetchBatchNews(
      allStocks.map(s => s.code),
      10
    );

    for (const [code, news] of Object.entries(fetchedNews)) {
      if (news && news.length) {
        db.saveNews(code, news);
      }
    }

    const mergedNews = {};
    for (const stock of allStocks) {
      mergedNews[stock.code] = [
        ...(allNews[stock.code] || []),
        ...(fetchedNews[stock.code] || []),
      ].slice(0, 15);
    }

    const review = await reviewRecommendations(latestRec);
    review.news = mergedNews;

    for (const item of review.items) {
      const newsForStock = mergedNews[item.code] || [];
      if (newsForStock.length > 0) {
        const keyNews = newsForStock.slice(0, 3);
        item.relevantNews = keyNews.map(n => ({
          title: n.title,
          time: n.published_at,
          source: n.source,
        }));
        if (item.verdict === 'miss' && keyNews.length > 0) {
          item.analysis += ` 期间相关新闻: "${keyNews[0].title}"，可能对股价走势产生了影响。`;
        }
      }
    }

    db.saveReview(prevDayIso, review, latestRec.id);
    db.markRecommendationReviewed(prevDayIso);

    console.log(`[定时任务] 复盘完成: 命中率 ${review.hitRate}, 胜率 ${review.beatRate}`);
  } catch (err) {
    console.error('[定时任务] 「复盘」任务失败:', err);
  }
}

function registerTasks() {
  const jobRecommend = new CronJob(
    '10 15 * * 1-5',
    taskGenerateRecommendations,
    null,
    true,
    TZ
  );

  const jobReview = new CronJob(
    '25 15 * * 1-5',
    taskReview,
    null,
    true,
    TZ
  );

  const jobMorning = new CronJob(
    '5 9 * * 1-5',
    taskGenerateRecommendations,
    null,
    true,
    TZ
  );

  console.log('[调度器] 定时任务已注册:');
  console.log('  - 每天 09:05 (UTC+8): 生成/更新当日推荐（备用）');
  console.log('  - 每天 15:10 (UTC+8): 生成下一交易日推荐（多策略）');
  console.log('  - 每天 15:25 (UTC+8): 执行复盘');

  return { jobRecommend, jobReview, jobMorning };
}

module.exports = { registerTasks, taskGenerateRecommendations, taskReview };
