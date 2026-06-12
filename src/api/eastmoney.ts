import { jsonp } from './jsonp';
import type { ApiResult, KLineData, Stock, BoardCategory } from '../types/stock';
import { detectBoardByCode } from '../types/stock';

export const EASTMONEY_NAME = '东方财富';

function mapCodeToEastmoney(code: string): string {
  if (code.startsWith('6') || code.startsWith('900')) {
    return `1.${code}`;
  }
  return `0.${code}`;
}

function parseKLine(klines: string[]): KLineData[] {
  const result: KLineData[] = [];
  for (const line of klines) {
    const parts = line.split(',');
    if (parts.length >= 6) {
      result.push({
        date: parts[0].split(' ')[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseFloat(parts[5]),
      });
    }
  }
  return result;
}

export async function fetchKLine(
  code: string,
  days: number = 60
): Promise<ApiResult<KLineData[]>> {
  const secid = mapCodeToEastmoney(code);
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${encodeURIComponent(
    secid
  )}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&beg=0&end=20500101&lmt=${days}`;

  try {
    const resp = await jsonp<{
      result?: { klines: string[] } | null;
      code?: number;
    }>(url, {
      callbackParam: 'cb',
      timeout: 15000,
    });

    if (!resp || !resp.result || !resp.result.klines || resp.result.klines.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_DATA',
          message: '未获取到K线数据',
          provider: EASTMONEY_NAME,
        },
      };
    }

    return {
      success: true,
      data: parseKLine(resp.result.klines),
      provider: EASTMONEY_NAME,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '请求失败',
        provider: EASTMONEY_NAME,
      },
    };
  }
}

interface DiffQuoteItem {
  f2: number;
  f3: number;
  f4: number;
  f5: number;
  f6: number;
  f8: number;
  f10: number;
  f12: string;
  f14: string;
  f15: number;
  f16: number;
  f17: number;
  f18: number;
  f57?: string;
  f58?: string;
  f60?: number;
  f116?: number;
  f117?: number;
  f127?: number;
  f141?: number;
  f162?: number;
  f167?: number;
  f168?: number;
  f171?: number;
}

function safeNum(v: number | undefined | string, fallback = 0): number {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string') {
    if (v === '-' || v === '') return fallback;
    const n = parseFloat(v);
    return Number.isNaN(n) ? fallback : n;
  }
  if (Number.isNaN(v)) return fallback;
  return v;
}

/**
 * 使用 clist/get 按板块筛选获取全市场候选股票。
 * fs 参数用来指定板块:
 * - m:0+t:6 深市主板
 * - m:0+t:80 创业板
 * - m:1+t:2 沪市主板
 * - m:1+t:23 科创板
 * - m:0+t:81 北交所
 */
interface ClistResponse {
  data?: {
    total?: number;
    diff?: Array<Record<string, unknown>> | null;
  } | null;
}

async function fetchClist(
  fs: string,
  pageSize: number = 60
): Promise<Array<Record<string, unknown>>> {
  const fields =
    'f2,f3,f4,f5,f6,f8,f10,f12,f14,f15,f16,f17,f18,f20,f21,f115,f128,f140,f141,f162,f167,f168,f171';
  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pageSize}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(fs)}&fields=${encodeURIComponent(fields)}`;

  const resp = await jsonp<ClistResponse>(url, {
    callbackParam: 'cb',
    timeout: 20000,
  });

  if (!resp || !resp.data || !resp.data.diff || !Array.isArray(resp.data.diff)) {
    return [];
  }
  return resp.data.diff;
}

function buildStockFromClist(
  q: Record<string, unknown>,
  forcedBoard?: BoardCategory
): Stock | null {
  const code = typeof q.f12 === 'string' ? q.f12 : String(q.f12 ?? '');
  const name = typeof q.f14 === 'string' ? q.f14 : String(q.f14 ?? '');
  if (!code) return null;

  const price = safeNum(q.f2 as number | undefined);
  const preClose = safeNum(q.f18 as number | undefined);
  if (price <= 0 && preClose <= 0) return null;

  const changePercent = safeNum(q.f3 as number | undefined);
  const changeAmount = safeNum(q.f4 as number | undefined);
  const volume = safeNum(q.f5 as number | undefined);
  const turnover = safeNum(q.f6 as number | undefined);
  const turnoverRate = safeNum(q.f8 as number | undefined);
  const volumeRatio = safeNum(q.f10 as number | undefined, 1);
  const marketCap = safeNum(q.f20 as number | undefined);
  const pe = safeNum(q.f9 as number | undefined);

  // 过滤掉价格异常/停牌/一字涨停：过于极端的数据不适合作为"下一交易日推荐"
  if (price <= 0) return null;
  if (changePercent >= 9.9 || changePercent <= -9.9) return null; // 过滤涨跌停

  const board = forcedBoard ?? detectBoardByCode(code);

  // 综合评分: 动量(changePercent) * 2 + 量比(volumeRatio) * 1.5 + 换手率(turnoverRate) * 0.5
  // 减去极端涨幅惩罚，避免选择已经涨停或短期过热的股票
  let penalty = 0;
  if (changePercent > 7) penalty = (changePercent - 7) * 1.5;
  if (changePercent < -3) penalty = Math.abs(changePercent + 3) * 2;

  const score = changePercent * 2 + volumeRatio * 1.5 + turnoverRate * 0.5 - penalty;

  const reasons: string[] = [];
  if (changePercent > 3) reasons.push('涨幅较大');
  if (changePercent > 0) reasons.push('上涨');
  if (changePercent < 0) reasons.push('下跌');
  if (volumeRatio > 2) reasons.push('量比放大');
  if (turnoverRate > 5) reasons.push('换手活跃');

  // 主力净流入估算 (涨跌额 * 成交量 / 10000)，单位约为万元
  const mainNetFlow = (changeAmount * volume) / 10000;

  return {
    code,
    name,
    price,
    changePercent,
    changeAmount,
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
    mainNetFlow,
    fiveDayNetFlow: 0,
    tenDayNetFlow: 0,
    selectionReasons: reasons,
    lastUpdate: Date.now(),
    board,
    score,
  };
}

/**
 * 从指定板块获取候选股票，经综合评分排序后返回前 N 只。
 */
export async function fetchBoardCandidates(
  fs: string,
  forcedBoard?: BoardCategory,
  pageSize: number = 80
): Promise<Stock[]> {
  try {
    const rawList = await fetchClist(fs, pageSize);
    const stocks: Stock[] = [];
    for (const q of rawList) {
      const s = buildStockFromClist(q, forcedBoard);
      if (s) stocks.push(s);
    }

    // 按综合评分降序排序
    stocks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return stocks;
  } catch {
    return [];
  }
}

/**
 * 并发获取 3 个板块的推荐候选。
 */
export async function fetchAllBoardCandidates(): Promise<{
  mainAndChiNext: Stock[];
  star: Stock[];
  bse: Stock[];
}> {
  const [mainCandidates, chinextCandidates, starCandidates, bseCandidates] = await Promise.all([
    fetchBoardCandidates('m:0+t:6,m:1+t:2', 'main', 80), // 深市主板 + 沪市主板
    fetchBoardCandidates('m:0+t:80', 'chinext', 80), // 创业板
    fetchBoardCandidates('m:1+t:23', 'star', 80), // 科创板
    fetchBoardCandidates('m:0+t:81', 'bse', 80), // 北交所
  ]);

  // 合并主板和创业板为"其他板块"
  const mainAndChiNext = [...mainCandidates, ...chinextCandidates]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    mainAndChiNext,
    star: starCandidates,
    bse: bseCandidates,
  };
}

export async function fetchBatchQuotes(
  codes: { code: string; name: string }[]
): Promise<ApiResult<Stock[]>> {
  if (codes.length === 0) {
    return {
      success: false,
      error: {
        code: 'EMPTY_POOL',
        message: '股票池为空',
        provider: EASTMONEY_NAME,
      },
    };
  }

  const secids = codes.map((c) => mapCodeToEastmoney(c.code)).join(',');
  const fields =
    'f2,f3,f4,f5,f6,f8,f10,f12,f14,f15,f16,f17,f18,f57,f58,f60,f62,f116,f117,f127,f141,f162,f167,f168,f171';

  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${encodeURIComponent(
    secids
  )}&fields=${encodeURIComponent(fields)}&fltt=2&invt=2&ut=b2884a393a59ad6400ee2bf6f7b7675a`;

  try {
    const resp = await jsonp<{
      data?: { diff?: Array<DiffQuoteItem> | null } | null;
    }>(url, {
      callbackParam: 'cb',
      timeout: 20000,
    });

    if (!resp || !resp.data || !resp.data.diff || !Array.isArray(resp.data.diff) || resp.data.diff.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_DATA',
          message: '未获取到行情数据',
          provider: EASTMONEY_NAME,
        },
      };
    }

    const quoteMap = new Map<string, DiffQuoteItem>();
    for (const q of resp.data.diff) {
      if (q && q.f12) quoteMap.set(q.f12, q);
    }

    const stocks: Stock[] = [];

    for (const meta of codes) {
      const quote = quoteMap.get(meta.code);
      if (!quote) continue;

      const preClose = safeNum(quote.f18);
      const price = safeNum(quote.f2, preClose);
      const changePercent = safeNum(quote.f3);
      const changeAmount = safeNum(quote.f4);
      const volume = safeNum(quote.f5);
      const turnover = safeNum(quote.f6);
      const turnoverRate = safeNum(quote.f8);
      const volumeRatio = safeNum(quote.f10, 1);
      const marketCap = safeNum(quote.f116);
      const pe = safeNum(quote.f167);

      const reasons: string[] = [];
      if (changePercent > 3) reasons.push('涨幅较大');
      if (changePercent < -3) reasons.push('跌幅较大');
      if (volumeRatio > 2) reasons.push('量比放大');
      if (changePercent > 0) reasons.push('上涨');
      if (changePercent < 0) reasons.push('下跌');

      const mainNetFlow = (changeAmount * volume) / 10000;
      const board = detectBoardByCode(meta.code);

      stocks.push({
        code: meta.code,
        name: quote.f14 || meta.name,
        price,
        changePercent,
        changeAmount,
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
        mainNetFlow,
        fiveDayNetFlow: 0,
        tenDayNetFlow: 0,
        selectionReasons: reasons,
        lastUpdate: Date.now(),
        board,
      });
    }

    if (stocks.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_DATA',
          message: '未获取到有效股票数据',
          provider: EASTMONEY_NAME,
        },
      };
    }

    return {
      success: true,
      data: stocks,
      provider: EASTMONEY_NAME,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '请求失败',
        provider: EASTMONEY_NAME,
      },
    };
  }
}

export async function fetchSingleStock(
  code: string,
  name: string
): Promise<ApiResult<Stock>> {
  const result = await fetchBatchQuotes([{ code, name }]);
  if (!result.success) return result;
  if (result.data.length === 0) {
    return {
      success: false,
      error: {
        code: 'EMPTY_DATA',
        message: '未获取到股票数据',
        provider: EASTMONEY_NAME,
      },
    };
  }
  return { success: true, data: result.data[0], provider: result.provider };
}
