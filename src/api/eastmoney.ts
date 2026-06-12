import { jsonp } from './jsonp';
import type { ApiResult, KLineData, Stock } from '../types/stock';

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

function safeNum(v: number | undefined, fallback = 0): number {
  if (v === undefined || v === null || Number.isNaN(v)) return fallback;
  if (v === '-' as unknown) return fallback;
  return v;
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

      let rsi = 50;
      let macd = { dif: 0, dea: 0, histogram: 0 };
      let kdj = { k: 50, d: 50, j: 50 };
      let boll = { upper: price * 1.03, middle: price, lower: price * 0.97 };
      let mainNetFlow = 0;
      let fiveDayNetFlow = 0;
      let tenDayNetFlow = 0;
      const reasons: string[] = [];

      if (changePercent > 3) reasons.push('涨幅较大');
      if (changePercent < -3) reasons.push('跌幅较大');
      if (volumeRatio > 2) reasons.push('量比放大');
      if (changePercent > 0) reasons.push('上涨');
      if (changePercent < 0) reasons.push('下跌');

      mainNetFlow = (changeAmount * volume) / 10000;

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
        rsi,
        macd,
        kdj,
        boll,
        mainNetFlow,
        fiveDayNetFlow,
        tenDayNetFlow,
        selectionReasons: reasons,
        lastUpdate: Date.now(),
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
