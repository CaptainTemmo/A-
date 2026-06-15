'use strict';

const fetch = require('node-fetch');

const BASE_URL = 'https://push2.eastmoney.com';
const HIS_URL = 'https://push2his.eastmoney.com';
const EM_URL = 'https://www.eastmoney.com';

function emHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://finance.eastmoney.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
}

/**
 * 通用的东方财富 API 请求 (非 JSONP, 服务端直接 fetch)
 */
async function emFetch(url, timeout = 15000) {
  const controller = new fetch.timeout ? null : AbortSignal.timeout(timeout);
  const response = await fetch(url, {
    headers: emHeaders(),
    signal: controller,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

/**
 * 通用代码映射
 */
function mapCode(code) {
  if (code.startsWith('6') || code.startsWith('900')) return `1.${code}`;
  if (code.startsWith('8') || code.startsWith('4')) return `0.${code}`; // 北交所
  return `0.${code}`;
}

/**
 * 按板块获取候选股票 (clist/get)
 * 支持分页，默认获取 3 页 × 100 条 = 300 只候选
 */
async function fetchBoardCandidates(boardId, boardName, totalTarget = 300) {
  const fields = 'f2,f3,f4,f5,f6,f8,f10,f12,f14,f15,f16,f17,f18,f20,f57,f58,f60,f62,f100,f104,f105,f116,f117,f128,f140,f141,f162,f167,f168';
  const pageSize = 100; // 单页最大有效条数
  const pageCount = Math.ceil(totalTarget / pageSize); // 需要请求的页数

  const allRaw = [];

  for (let pn = 1; pn <= pageCount; pn++) {
    const url = `${BASE_URL}/api/qt/clist/get?pn=${pn}&pz=${pageSize}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(boardId)}&fields=${encodeURIComponent(fields)}`;
    try {
      const data = await emFetch(url, 20000);
      if (data?.data?.diff && Array.isArray(data.data.diff)) {
        allRaw.push(...data.data.diff);
      }
    } catch (err) {
      console.warn(`[eastmoney] 分页 ${pn} 获取失败 (${boardName}):`, err.message);
    }
    // 每页间隔 200ms 避免过快请求
    if (pn < pageCount) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const seen = new Set();
  const uniqueRaw = allRaw.filter(q => {
    const code = String(q.f12 ?? '');
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });

  const stocks = [];
  for (const q of uniqueRaw) {
    const code = String(q.f12 ?? '');
    const name = String(q.f14 ?? '');
    const price = parseFloat(q.f2) || 0;
    const preClose = parseFloat(q.f18) || 0;

    if (!code || price <= 0) continue;

    // 过滤涨跌停（已经没有次日涨停空间了）
    const changePercent = parseFloat(q.f3) || 0;
    if (changePercent >= 9.9 || changePercent <= -9.9) continue;

    const volume = parseFloat(q.f5) || 0;
    const turnover = parseFloat(q.f6) || 0;
    const turnoverRate = parseFloat(q.f8) || 0;
    const volumeRatio = parseFloat(q.f10) || 1;
    const marketCap = parseFloat(q.f20) || 0;
    const pe = parseFloat(q.f9) || 0;

    // 综合评分
    let penalty = 0;
    if (changePercent > 7) penalty = (changePercent - 7) * 1.5;
    if (changePercent < -3) penalty = Math.abs(changePercent + 3) * 2;
    const score = changePercent * 2 + volumeRatio * 1.5 + turnoverRate * 0.5 - penalty;

    const reasons = [];
    if (changePercent > 3) reasons.push('涨幅较大');
    if (changePercent > 0) reasons.push('上涨');
    if (changePercent < 0) reasons.push('下跌');
    if (volumeRatio > 2) reasons.push('量比放大');
    if (turnoverRate > 5) reasons.push('换手活跃');
    if (volume > 50000000) reasons.push('成交量大');

    stocks.push({
      code,
      name,
      board: boardName,
      price,
      changePercent,
      changeAmount: parseFloat(q.f4) || 0,
      volume,
      turnover,
      turnoverRate,
      volumeRatio,
      marketCap,
      pe,
      rsi: 50,
      macd: { dif: 0, dea: 0, histogram: 0 },
      kdj: { k: 50, d: 50, j: 50 },
      boll: { upper: price * 1.03, middle: price, lower: price * 0.97 },
      mainNetFlow: (parseFloat(q.f4) || 0) * volume / 10000,
      fiveDayNetFlow: 0,
      tenDayNetFlow: 0,
      selectionReasons: reasons,
      lastUpdate: Date.now(),
      score,
    });
  }

  return stocks;
}

/**
 * 获取 K 线数据
 */
async function fetchKLine(code, days = 60) {
  const secid = mapCode(code);
  const url = `${HIS_URL}/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=0&end=20500101&lmt=${days}`;

  const data = await emFetch(url, 15000);
  if (!data?.result?.klines || !data.result.klines.length) return [];

  return data.result.klines.map(line => {
    const parts = line.split(',');
    return {
      date: parts[0].split(' ')[0],
      open: parseFloat(parts[1]),
      close: parseFloat(parts[2]),
      high: parseFloat(parts[3]),
      low: parseFloat(parts[4]),
      volume: parseFloat(parts[5]),
    };
  });
}

/**
 * 批量获取指定股票的实时行情
 */
async function fetchQuotes(codes) {
  if (!codes || codes.length === 0) return {};

  const secids = codes.map(c => mapCode(c)).join(',');
  const fields = 'f2,f3,f4,f5,f6,f8,f10,f12,f14,f15,f16,f17,f18,f20,f57,f58,f60,f62,f116,f117,f127,f141,f162,f167,f168,f171';
  const url = `${BASE_URL}/api/qt/ulist.np/get?secids=${encodeURIComponent(secids)}&fields=${encodeURIComponent(fields)}&fltt=2&invt=2&ut=b2884a393a59ad6400ee2bf6f7b7675a`;

  const data = await emFetch(url, 20000);
  if (!data?.data?.diff || !Array.isArray(data.data.diff)) return {};

  const map = {};
  for (const q of data.data.diff) {
    const code = String(q.f12 ?? '');
    map[code] = {
      price: parseFloat(q.f2) || 0,
      changePercent: parseFloat(q.f3) || 0,
      changeAmount: parseFloat(q.f4) || 0,
      volume: parseFloat(q.f5) || 0,
      turnover: parseFloat(q.f6) || 0,
      turnoverRate: parseFloat(q.f8) || 0,
      volumeRatio: parseFloat(q.f10) || 1,
      marketCap: parseFloat(q.f20) || 0,
      pe: parseFloat(q.f9) || 0,
    };
  }
  return map;
}

/**
 * 获取单只股票的新闻列表 (东方财富个股新闻接口)
 */
async function fetchStockNews(code, limit = 10) {
  try {
    // 东方财富个股新闻 API
    const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page=1&pageSize=${limit}&ann_type=SHA%2CSZA%2CBJA&client_source=web&stock_list=${encodeURIComponent(code)}`;
    const data = await emFetch(url, 10000);

    if (!data?.data?.list || !data.data.list.length) return [];

    return data.data.list.map(item => ({
      published_at: item.publish_time ? new Date(item.publish_time).toISOString() : null,
      title: item.title || '',
      content: item.notice_content || '',
      source: '东方财富',
      url: item.art_url || `https://data.eastmoney.com/notices/hot/${code}.html`,
    }));
  } catch {
    return [];
  }
}

/**
 * 获取多只股票的新闻 (批量)
 */
async function fetchBatchNews(codes, limitPerStock = 5) {
  const results = {};
  // 限制并发数
  const batchSize = 5;
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);
    const promises = batch.map(async (code) => {
      const news = await fetchStockNews(code, limitPerStock);
      return { code, news };
    });
    const batchResults = await Promise.allSettled(promises);
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) {
        results[r.value.code] = r.value.news;
      }
    }
    // 间隔 300ms 避免限流
    if (i + batchSize < codes.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  return results;
}

module.exports = {
  fetchBoardCandidates,
  fetchKLine,
  fetchQuotes,
  fetchStockNews,
  fetchBatchNews,
  emFetch,
};
