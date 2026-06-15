'use strict';

const { fetchBoardCandidates, fetchQuotes } = require('./eastmoney');
const { STRATEGY_LABELS, STRATEGY_DESCRIPTIONS } = require('../types/stock');

const BOARD_CONFIGS = [
  { id: 'm:0+t:6,m:1+t:2', name: 'main', label: '主板' },
  { id: 'm:0+t:80', name: 'chinext', label: '创业板' },
  { id: 'm:1+t:23', name: 'star', label: '科创板' },
  { id: 'm:0+t:81', name: 'bse', label: '北交所' },
];

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function getNextTradingDay(fromDate = new Date()) {
  let d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return formatDate(d);
}

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
 * 动量策略评分
 * 核心：近期涨幅 + 成交量 + 量比
 */
function scoreMomentum(stock) {
  let score = 0;
  
  // 涨幅贡献（最近表现）
  score += stock.changePercent * 2.5;
  
  // 量比贡献（活跃度）
  score += stock.volumeRatio * 1.8;
  
  // 换手率贡献
  score += stock.turnoverRate * 0.6;
  
  // 避免过热惩罚
  if (stock.changePercent > 7) {
    score -= (stock.changePercent - 7) * 1.5;
  }
  
  return Math.max(0, score);
}

/**
 * 价值策略评分
 * 核心：低PE、低PB、高股息、稳健经营
 */
function scoreValue(stock) {
  let score = 0;
  
  // 低PE加分（15-30之间最佳）
  const pe = stock.pe_ttm || stock.pe || 100;
  if (pe > 0 && pe <= 15) score += 30;
  else if (pe > 15 && pe <= 25) score += 20;
  else if (pe > 25 && pe <= 35) score += 10;
  
  // 低PB加分
  const pb = stock.pb || 100;
  if (pb > 0 && pb <= 2) score += 25;
  else if (pb > 2 && pb <= 3) score += 15;
  else if (pb > 3 && pb <= 5) score += 5;
  
  // 股息率加分
  const dy = stock.dividendYield || 0;
  score += dy * 3;
  
  // ROE要求
  const roe = stock.roe || 0;
  if (roe > 10) score += roe * 0.8;
  
  // 市值稳定性（大盘股更稳定）
  const marketCap = stock.marketCap || 0;
  if (marketCap > 50000000000) score += 10;
  
  return Math.max(0, score);
}

/**
 * 质量因子策略评分
 * 核心：ROE、毛利率、现金流、低负债
 */
function scoreQuality(stock) {
  let score = 0;
  
  // ROE是核心指标
  const roe = stock.roe || 0;
  if (roe > 0) score += roe * 2;
  if (roe >= 15) score += 20;
  
  // 毛利率
  const gm = stock.grossMargin || 0;
  score += gm * 0.5;
  if (gm >= 30) score += 15;
  
  // 净利率
  const nm = stock.netProfitMargin || 0;
  score += nm * 0.8;
  
  // 现金流
  const cf = stock.cashFlow || 0;
  if (cf > 0) score += 20;
  
  // 低负债
  const dr = stock.debtRatio || 100;
  if (dr < 50) score += 15;
  if (dr < 30) score += 10;
  
  return Math.max(0, score);
}

/**
 * 成长策略评分
 * 核心：营收增长、利润增长、高研发投入
 */
function scoreGrowth(stock) {
  let score = 0;
  
  // 营收增长
  const rg = stock.revenueGrowth || 0;
  score += rg * 1.5;
  if (rg >= 30) score += 25;
  else if (rg >= 20) score += 15;
  
  // 净利润增长
  const pg = stock.profitGrowth || 0;
  score += pg * 1.2;
  
  // 市值规模（中小盘成长空间大）
  const marketCap = stock.marketCap || 0;
  if (marketCap > 5000000000 && marketCap < 50000000000) {
    score += 15;
  }
  
  // 股价活跃度
  score += stock.volumeRatio * 0.5;
  
  return Math.max(0, score);
}

/**
 * 反转策略评分
 * 核心：超跌反弹、波动率收缩
 */
function scoreReverse(stock) {
  let score = 0;
  
  // 跌幅越大，反转潜力越大（但不能太极端）
  const change = stock.changePercent || 0;
  if (change < -3) {
    score += Math.min(Math.abs(change) * 3, 30);
  } else if (change < -1) {
    score += Math.abs(change) * 2;
  }
  
  // 波动率（ATR）收缩
  const atr = stock.atr || 0;
  if (atr > 0 && atr < 2) {
    score += 15;
  }
  
  // 量能萎缩（恐慌释放）
  const vr = stock.volumeRatio || 0;
  if (vr > 0 && vr < 0.8) {
    score += 20;
  }
  
  // 接近支撑位（布林带下轨）
  if (stock.boll?.lower) {
    const distToLower = (stock.price - stock.boll.lower) / stock.boll.lower;
    if (distToLower < 0.05) score += 15;
  }
  
  return Math.max(0, score);
}

/**
 * 趋势跟踪策略评分
 * 核心：均线多头排列、MACD金叉、价格突破
 */
function scoreTrend(stock) {
  let score = 0;
  
  // 均线多头排列
  const ma5 = stock.ma5 || stock.price;
  const ma10 = stock.ma10 || stock.price;
  const ma20 = stock.ma20 || stock.price;
  
  if (ma5 > ma10 && ma10 > ma20) {
    score += 30;
  } else if (ma5 > ma10) {
    score += 15;
  }
  
  // 价格在均线上方
  if (stock.price > ma20) score += 15;
  
  // MACD指标
  const macd = stock.macd || { dif: 0, dea: 0 };
  if (macd.dif > macd.dea) score += 20;
  if (macd.dif > 0) score += 10;
  
  // KDJ指标
  const kdj = stock.kdj || { k: 50, d: 50, j: 50 };
  if (kdj.k > kdj.d && kdj.k > 50) score += 15;
  
  return Math.max(0, score);
}

/**
 * 资金流向策略评分
 * 核心：主力净流入、资金持续流入
 */
function scoreFundFlow(stock) {
  let score = 0;
  
  // 当日主力净流入
  score += Math.max(0, stock.mainNetFlow) / 10000;
  
  // 5日净流入
  score += Math.max(0, stock.fiveDayNetFlow) / 50000;
  
  // 10日净流入
  score += Math.max(0, stock.tenDayNetFlow) / 100000;
  
  // 量价配合（上涨时资金流入）
  if (stock.changePercent > 0 && stock.mainNetFlow > 0) {
    score += 15;
  }
  
  return Math.max(0, score);
}

/**
 * 波动率策略评分
 * 核心：布林带突破、ATR突破
 */
function scoreVolatility(stock) {
  let score = 0;
  
  // 布林带突破
  const boll = stock.boll;
  if (boll) {
    // 上轨突破（突破买入）
    if (stock.price > boll.upper) {
      score += 30;
    }
    // 下轨支撑（抄底）
    else if (stock.price >= boll.lower && stock.price < boll.middle) {
      score += 20;
    }
  }
  
  // ATR波动率（突破时波动率放大）
  const atr = stock.atr || 0;
  const volatility = stock.volatility || 0;
  if (atr > 0 && volatility > 1.5) {
    score += 20;
  }
  
  // 成交量配合
  score += stock.volumeRatio * 2;
  
  return Math.max(0, score);
}

/**
 * 多因子综合评分
 */
function scoreMultiFactor(stock, weights = {}) {
  const w = {
    momentum: weights.momentum || 0.15,
    value: weights.value || 0.15,
    quality: weights.quality || 0.2,
    growth: weights.growth || 0.15,
    trend: weights.trend || 0.15,
    fundFlow: weights.fundFlow || 0.1,
    volatility: weights.volatility || 0.1,
  };
  
  let totalScore = 0;
  totalScore += scoreMomentum(stock) * w.momentum;
  totalScore += scoreValue(stock) * w.value;
  totalScore += scoreQuality(stock) * w.quality;
  totalScore += scoreGrowth(stock) * w.growth;
  totalScore += scoreTrend(stock) * w.trend;
  totalScore += scoreFundFlow(stock) * w.fundFlow;
  totalScore += scoreVolatility(stock) * w.volatility;
  
  return totalScore;
}

const STRATEGY_SCORERS = {
  momentum: scoreMomentum,
  value: scoreValue,
  quality: scoreQuality,
  growth: scoreGrowth,
  reverse: scoreReverse,
  trend: scoreTrend,
  fund_flow: scoreFundFlow,
  volatility: scoreVolatility,
  multi_factor: scoreMultiFactor,
};

/**
 * 核心选股逻辑：按指定策略从全市场筛选
 */
async function generateRecommendations(strategyType = 'multi_factor', topN = 10) {
  console.log(`[推荐引擎] 使用策略: ${STRATEGY_LABELS[strategyType] || strategyType}`);
  
  const scorer = STRATEGY_SCORERS[strategyType] || scoreMultiFactor;
  
  const results = await Promise.all(
    BOARD_CONFIGS.map(cfg =>
      fetchBoardCandidates(cfg.id, cfg.name)
        .then(stocks => ({ ...cfg, stocks }))
        .catch(err => {
          console.error(`[推荐引擎] 获取 ${cfg.label} 失败:`, err.message);
          return { ...cfg, stocks: [] };
        })
    )
  );
  
  const mainChinextRaw = [
    ...(results.find(r => r.name === 'main')?.stocks || []),
    ...(results.find(r => r.name === 'chinext')?.stocks || []),
  ];
  const starRaw = results.find(r => r.name === 'star')?.stocks || [];
  const bseRaw = results.find(r => r.name === 'bse')?.stocks || [];
  
  // 对每只股票计算策略评分
  const scoreAndSort = (stocks) => {
    return stocks
      .map(stock => ({
        ...stock,
        score: scorer(stock),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  };
  
  const mainChinext = scoreAndSort(mainChinextRaw);
  const star = scoreAndSort(starRaw);
  const bse = scoreAndSort(bseRaw);
  
  const nextDay = getNextTradingDay();
  
  const result = {
    nextTradingDay: nextDay.display,
    nextTradingDayIso: nextDay.iso,
    strategyType,
    strategyName: STRATEGY_LABELS[strategyType] || strategyType,
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
    description: STRATEGY_DESCRIPTIONS[strategyType] || '',
  };
  
  console.log(`[推荐引擎] ${result.strategyName} 推荐完成: ${result.summary.total_count} 只, 目标日: ${nextDay.display}`);
  return result;
}

/**
 * 复盘逻辑
 */
async function reviewRecommendations(recommendations) {
  if (!recommendations || !recommendations.boards) {
    throw new Error('无效的推荐数据');
  }
  
  const prevDay = getPrevTradingDay();
  console.log(`[复盘引擎] 开始复盘 ${prevDay.display} 的推荐...`);
  
  const allStocks = [
    ...recommendations.boards.main_chinext || [],
    ...recommendations.boards.star || [],
    ...recommendations.boards.bse || [],
  ];
  const codes = allStocks.map(s => s.code);
  
  if (codes.length === 0) {
    return { success: false, message: '无推荐股票可复盘' };
  }
  
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
        analysis: '该股票在复盘日无行情数据',
      });
      continue;
    }
    
    const actualChangePercent = quote.changePercent;
    const expectedDirection = stock.changePercent >= 0 ? '涨' : '跌';
    const actualDirection = actualChangePercent >= 0 ? '涨' : '跌';
    
    let verdict = 'neutral';
    let performance = '符合预期';
    let analysis = '';
    
    if (stock.changePercent > 1) {
      if (actualChangePercent > 0) {
        verdict = 'beat';
        performance = '超出预期';
        analysis = `推荐时预期上涨(${stock.changePercent.toFixed(2)}%), 实际表现更强劲(${actualChangePercent.toFixed(2)}%), 可能受利好消息或资金持续推动。`;
      } else if (actualChangePercent >= -1) {
        verdict = 'meet';
        performance = '符合预期';
        analysis = `推荐时预期上涨(${stock.changePercent.toFixed(2)}%), 实际基本持平(${actualChangePercent.toFixed(2)}%), 说明多空力量较为均衡。`;
      } else {
        verdict = 'miss';
        performance = '未达预期';
        analysis = `推荐时预期上涨(${stock.changePercent.toFixed(2)}%), 实际下跌(${actualChangePercent.toFixed(2)}%), 可能是大盘整体调整或个股遭遇短期利空。`;
      }
    } else if (stock.changePercent < -1) {
      if (actualChangePercent < 0) {
        verdict = 'beat';
        performance = '超出预期';
        analysis = `推荐时预期下跌(${stock.changePercent.toFixed(2)}%), 实际下跌更明显(${actualChangePercent.toFixed(2)}%), 下跌趋势得到确认。`;
      } else if (actualChangePercent <= 1) {
        verdict = 'meet';
        performance = '符合预期';
        analysis = `推荐时预期下跌(${stock.changePercent.toFixed(2)}%), 实际基本持平(${actualChangePercent.toFixed(2)}%), 可能出现抄底资金。`;
      } else {
        verdict = 'miss';
        performance = '未达预期';
        analysis = `推荐时预期下跌(${stock.changePercent.toFixed(2)}%), 实际反而大幅上涨(${actualChangePercent.toFixed(2)}%), 可能是公司发布重大利好。`;
      }
    } else {
      if (Math.abs(actualChangePercent) > 3) {
        verdict = 'surprise';
        performance = actualChangePercent > 0 ? '意外大涨' : '意外大跌';
        analysis = `推荐时预期小幅波动(${stock.changePercent.toFixed(2)}%), 实际大幅${actualChangePercent > 0 ? '上涨' : '下跌'}(${actualChangePercent.toFixed(2)}%), 市场关注度可能发生重大变化。`;
      } else {
        verdict = 'meet';
        performance = '符合预期';
        analysis = `推荐时预期小幅波动(${stock.changePercent.toFixed(2)}%), 实际波动在合理范围内(${actualChangePercent.toFixed(2)}%), 市场走势平稳。`;
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
  
  const verdicts = { beat: 0, meet: 0, miss: 0, neutral: 0, unknown: 0, surprise: 0 };
  for (const item of reviewItems) {
    if (item.verdict) verdicts[item.verdict]++;
  }
  
  return {
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
    news: {},
    generatedAt: new Date().toISOString(),
    strategyType: recommendations.strategyType || 'multi_factor',
    strategyName: recommendations.strategyName || '多因子',
  };
}

module.exports = {
  generateRecommendations,
  reviewRecommendations,
  getNextTradingDay,
  getPrevTradingDay,
  formatDate,
  STRATEGY_LABELS,
  STRATEGY_DESCRIPTIONS,
};
