import { fetchBatchQuotes, fetchKLine, EASTMONEY_NAME } from './eastmoney';
import { getStockPool } from './stockPool';
import type { ApiResult, Stock, KLineData, StockFilterCriteria, Strategy } from '../types/stock';

export interface ServiceResult {
  stocks: Stock[];
  provider: string;
  errors: string[];
}

export async function fetchStockList(
  limit: number = 40
): Promise<ServiceResult> {
  const pool = getStockPool().slice(0, limit);
  const errors: string[] = [];

  const eastResult = await fetchBatchQuotes(pool);

  if (eastResult.success) {
    return {
      stocks: eastResult.data,
      provider: eastResult.provider,
      errors: [],
    };
  }

  errors.push(`${eastResult.error.provider}: ${eastResult.error.message}`);

  return {
    stocks: [],
    provider: EASTMONEY_NAME,
    errors,
  };
}

export async function fetchStockDetail(
  code: string,
  name: string
): Promise<ApiResult<Stock>> {
  return await fetchBatchQuotes([{ code, name }]).then((r) => {
    if (!r.success) return r;
    if (r.data.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_DATA',
          message: '未获取到股票数据',
          provider: r.provider,
        },
      };
    }
    return { success: true, data: r.data[0], provider: r.provider };
  });
}

export async function fetchStockKLine(
  code: string,
  days: number = 60
): Promise<ApiResult<KLineData[]>> {
  return fetchKLine(code, days);
}

export function filterStocks(
  stocks: Stock[],
  criteria: StockFilterCriteria
): Stock[] {
  return stocks.filter((stock) => {
    if (
      stock.rsi < criteria.rsiRange[0] ||
      stock.rsi > criteria.rsiRange[1]
    ) {
      return false;
    }

    if (stock.volumeRatio < criteria.volumeRatioMin) return false;
    if (stock.mainNetFlow < criteria.mainNetFlowMin) return false;
    if (
      stock.marketCap < criteria.marketCapRange[0] ||
      stock.marketCap > criteria.marketCapRange[1]
    )
      return false;
    if (stock.pe < criteria.peRange[0] || stock.pe > criteria.peRange[1])
      return false;
    if (stock.price < criteria.priceRange[0] || stock.price > criteria.priceRange[1])
      return false;
    if (
      stock.changePercent < criteria.changePercentRange[0] ||
      stock.changePercent > criteria.changePercentRange[1]
    )
      return false;

    return true;
  });
}

export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'conservative',
    name: '稳健型',
    type: 'conservative',
    criteria: {
      rsiRange: [30, 70],
      macdSignal: 'neutral',
      volumeRatioMin: 0.5,
      mainNetFlowMin: 0,
      consecutiveDaysMin: 3,
      marketCapRange: [50000000000, Infinity],
      peRange: [0, 30],
      priceRange: [5, 200],
      changePercentRange: [-5, 5],
    },
  },
  {
    id: 'aggressive',
    name: '激进型',
    type: 'aggressive',
    criteria: {
      rsiRange: [0, 100],
      macdSignal: 'golden_cross',
      volumeRatioMin: 1.5,
      mainNetFlowMin: 0,
      consecutiveDaysMin: 1,
      marketCapRange: [0, Infinity],
      peRange: [0, 100],
      priceRange: [3, 100],
      changePercentRange: [-10, 10],
    },
  },
  {
    id: 'value',
    name: '价值型',
    type: 'value',
    criteria: {
      rsiRange: [20, 60],
      macdSignal: 'neutral',
      volumeRatioMin: 0.5,
      mainNetFlowMin: -1000,
      consecutiveDaysMin: 5,
      marketCapRange: [100000000000, Infinity],
      peRange: [0, 20],
      priceRange: [5, 150],
      changePercentRange: [-10, 5],
    },
  },
];

export function calculateFundFlowData(klines: KLineData[]) {
  const result: Array<{ date: string; mainFlow: number; fiveDayFlow: number; tenDayFlow: number }> = [];
  for (let i = 0; i < klines.length; i++) {
    const k = klines[i];
    const change = k.close - k.open;
    const mainFlow = (change * k.volume) / 10000;

    let fiveDay = 0;
    let tenDay = 0;
    for (let j = Math.max(0, i - 4); j <= i; j++) {
      const kj = klines[j];
      fiveDay += ((kj.close - kj.open) * kj.volume) / 10000;
    }
    for (let j = Math.max(0, i - 9); j <= i; j++) {
      const kj = klines[j];
      tenDay += ((kj.close - kj.open) * kj.volume) / 10000;
    }

    result.push({
      date: k.date,
      mainFlow: Math.round(mainFlow * 100) / 100,
      fiveDayFlow: Math.round(fiveDay * 100) / 100,
      tenDayFlow: Math.round(tenDay * 100) / 100,
    });
  }
  return result;
}
