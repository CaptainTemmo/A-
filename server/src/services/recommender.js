'use strict';

const { fetchBoardCandidates, fetchQuotes } = require('./eastmoney');

const BOARD_CONFIGS = [
  { id: 'm:0+t:6,m:1+t:2', name: 'main', label: '主板' },   // 深市主板 + 沪市主板
  { id: 'm:0+t:80',         name: 'chinext', label: '创业板' },
  { id: 'm:1+t:23',         name: 'star', label: '科创板' },
  { id: 'm:0+t:81',         name: 'bse', label: '北交所' },
];

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/**
 * 计算下一个交易日（仅处理周末，节假日需外部维护）
 */
function getNextTradingDay(fromDate = new Date()) {
  let d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return formatDate(d);
}

/**
 * 获取上一个交易日（用于复盘）
 */
function getPrevTradingDay(fromDate = new Date()) {
  let d = new Date(fromDate);
  d.setDate(d.getDate() - 1);
  while (isWeekend(d)) {
    d.setDate(d.getDate() - 1);
  }
  return formatDate(d);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekday = '日一二三四五六'[d.getDay()];
  return { iso: `${y}-${m}-${day}`, display: `${y}-${m}-${day} (周${weekday})` };
}

/**
 * 判断是否为交易时段（简单判断）
 */
function isTradingDay(date = new Date()) {
  if (isWeekend(date)) return false;
  const h = date.getHours();
  const min = date.getMinutes();
  // 9:15-11:30, 13:00-15:00
  const morning = h > 9 || (h === 9 && min >= 15);
  const morningEnd = h < 11 || (h === 11 && min <= 30);
  const afternoon = h >= 13 && h < 15;
  return morning && morningEnd || afternoon;
}

/**
 * 生成推荐
 * @param {number} topN - 每个板块推荐数量
 */
async function generateRecommendations(topN = 10) {
  console.log('[推荐引擎] 开始获取各板块候选股票...');

  const results = await Promise.all(
    BOARD_CONFIGS.map(cfg =>
      fetchBoardCandidates(cfg.id, cfg.name, 300) // 每板块取 300 只候选（3页×100条），再从中选 topN
        .then(stocks => ({ ...cfg, stocks }))
        .catch(err => {
          console.error(`[推荐引擎] 获取 ${cfg.label} 失败:`, err.message);
          return { ...cfg, stocks: [] };
        })
    )
  );

  // 合并主板和创业板
  const mainChinextRaw = [
    ...(results.find(r => r.name === 'main')?.stocks || []),
    ...(results.find(r => r.name === 'chinext')?.stocks || []),
  ];
  mainChinextRaw.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const mainChinext = mainChinextRaw.slice(0, topN);

  const star = (results.find(r => r.name === 'star')?.stocks || [])
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topN);

  const bse = (results.find(r => r.name === 'bse')?.stocks || [])
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topN);

  const nextDay = getNextTradingDay();

  const result = {
    nextTradingDay: nextDay.display,
    nextTradingDayIso: nextDay.iso,
    boards: {
      main_chinext: mainChinext,
      star,
      bse,
    },
    summary: {
      main_chinext_count: mainChinext.length,
      star_count: star.length,
      bse_count: bse.length,
      total_count: mainChinext.length + star.length + bse.length,
    },
    generatedAt: new Date().toISOString(),
    provider: '东方财富',
  };

  console.log(`[推荐引擎] 推荐生成完成: ${result.summary.total_count} 只, 目标日: ${nextDay.display}`);
  return result;
}

/**
 * 对推荐进行复盘
 */
async function reviewRecommendations(recommendations) {
  if (!recommendations || !recommendations.boards) {
    throw new Error('无效的推荐数据');
  }

  const prevDay = getPrevTradingDay();
  console.log(`[复盘引擎] 开始复盘 ${prevDay.display} 的推荐...`);

  // 收集所有推荐股票代码
  const allStocks = [
    ...recommendations.boards.main_chinext || [],
    ...recommendations.boards.star || [],
    ...recommendations.boards.bse || [],
  ];
  const codes = allStocks.map(s => s.code);

  if (codes.length === 0) {
    return { success: false, message: '无推荐股票可复盘' };
  }

  // 获取这些股票在上一交易日的收盘数据
  console.log(`[复盘引擎] 获取 ${codes.length} 只股票的行情数据...`);
  const quotes = await fetchQuotes(codes);

  const reviewItems = [];
  for (const stock of allStocks) {
    const quote = quotes[stock.code];
    if (!quote) {
      reviewItems.push({
        ...stock,
        actualClose: null,
        actualChange: null,
        actualChangePercent: null,
        performance: '无法获取数据',
        verdict: 'unknown',
        analysis: '该股票在复盘日无行情数据，可能已停牌或退市',
      });
      continue;
    }

    const actualChangePercent = quote.changePercent;
    const expectedDirection = stock.changePercent >= 0 ? '涨' : '跌';
    const actualDirection = actualChangePercent >= 0 ? '涨' : '跌';

    // 判断表现
    let verdict = 'neutral';
    let performance = '符合预期';
    let analysis = '';

    // 预期上涨 (changePercent > 0) -> 实际也上涨或持平
    if (stock.changePercent > 1) {
      if (actualChangePercent > 0) {
        verdict = 'beat';
        performance = '超出预期';
        analysis = `推荐时预期上涨(${stock.changePercent.toFixed(2)}%), 实际表现更强劲(${actualChangePercent.toFixed(2)}%), ` +
          `可能受利好消息或资金持续推动。`;
      } else if (actualChangePercent >= -1) {
        verdict = 'meet';
        performance = '符合预期';
        analysis = `推荐时预期上涨(${stock.changePercent.toFixed(2)}%), 实际基本持平(${actualChangePercent.toFixed(2)}%), ` +
          `说明多空力量较为均衡。`;
      } else {
        verdict = 'miss';
        performance = '未达预期';
        analysis = `推荐时预期上涨(${stock.changePercent.toFixed(2)}%), 实际下跌(${actualChangePercent.toFixed(2)}%), ` +
          `可能是大盘整体调整或个股遭遇短期利空。`;
      }
    }
    // 预期下跌 (changePercent < 0) -> 实际也下跌
    else if (stock.changePercent < -1) {
      if (actualChangePercent < 0) {
        verdict = 'beat';
        performance = '超出预期';
        analysis = `推荐时预期下跌(${stock.changePercent.toFixed(2)}%), 实际下跌更明显(${actualChangePercent.toFixed(2)}%), ` +
          `下跌趋势得到确认，可能存在基本面走弱。`;
      } else if (actualChangePercent <= 1) {
        verdict = 'meet';
        performance = '符合预期';
        analysis = `推荐时预期下跌(${stock.changePercent.toFixed(2)}%), 实际基本持平(${actualChangePercent.toFixed(2)}%), ` +
          `可能出现抄底资金导致跌幅收窄。`;
      } else {
        verdict = 'miss';
        performance = '未达预期';
        analysis = `推荐时预期下跌(${stock.changePercent.toFixed(2)}%), 实际反而大幅上涨(${actualChangePercent.toFixed(2)}%), ` +
          `可能是公司发布重大利好(如业绩超预期、政策支持等)，逆转了下跌趋势。`;
      }
    }
    // 预期小幅波动
    else {
      if (Math.abs(actualChangePercent) > 3) {
        verdict = 'surprise';
        performance = actualChangePercent > 0 ? '意外大涨' : '意外大跌';
        analysis = `推荐时预期小幅波动(${stock.changePercent.toFixed(2)}%), 实际大幅${actualChangePercent > 0 ? '上涨' : '下跌'}(${actualChangePercent.toFixed(2)}%), ` +
          `市场对该股票的关注度可能发生重大变化。`;
      } else {
        verdict = 'meet';
        performance = '符合预期';
        analysis = `推荐时预期小幅波动(${stock.changePercent.toFixed(2)}%), 实际波动在合理范围内(${actualChangePercent.toFixed(2)}%), ` +
          `市场走势平稳。`;
      }
    }

    reviewItems.push({
      code: stock.code,
      name: stock.name,
      board: stock.board,
      recommendedChange: stock.changePercent,
      recommendedReason: stock.selectionReasons,
      actualClose: quote.price,
      actualChange: quote.changeAmount,
      actualChangePercent,
      performance,
      verdict,
      analysis,
    });
  }

  // 统计汇总
  const verdicts = { beat: 0, meet: 0, miss: 0, neutral: 0, unknown: 0, surprise: 0 };
  for (const item of reviewItems) {
    if (item.verdict) verdicts[item.verdict] = (verdicts[item.verdict] || 0) + 1;
  }

  const result = {
    reviewDate: prevDay.display,
    reviewDateIso: prevDay.iso,
    totalCount: reviewItems.length,
    verdicts,
    hitRate: verdicts.beat + verdicts.meet > 0
      ? (((verdicts.beat + verdicts.meet) / reviewItems.length) * 100).toFixed(1) + '%'
      : 'N/A',
    beatRate: verdicts.beat > 0
      ? ((verdicts.beat / reviewItems.length) * 100).toFixed(1) + '%'
      : '0%',
    surpriseRate: verdicts.surprise > 0
      ? ((verdicts.surprise / reviewItems.length) * 100).toFixed(1) + '%'
      : '0%',
    items: reviewItems,
    news: {}, // 新闻数据由调用方注入
    generatedAt: new Date().toISOString(),
  };

  console.log(`[复盘引擎] 复盘完成: 命中率 ${result.hitRate}, 胜率 ${result.beatRate}`);
  return result;
}

module.exports = {
  generateRecommendations,
  reviewRecommendations,
  getNextTradingDay,
  getPrevTradingDay,
  formatDate,
  isTradingDay,
  BOARD_CONFIGS,
};
