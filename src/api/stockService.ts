import { fetchBatchQuotes, fetchKLine, fetchAllBoardCandidates, EASTMONEY_NAME } from './eastmoney';
import { getStockPool } from './stockPool';
import type { ApiResult, Stock, KLineData, StockFilterCriteria, Strategy, BoardRecommendations } from '../types/stock';

/**
 * 计算下一交易日（周末自动顺延到周一）。
 * 由于浏览器无法联网获取完整的节假日列表，这里仅处理周末。
 */
export function getNextTradingDay(): string {
  const now = new Date();
  // 判断当前时间是否在交易日盘中 (9:30-15:00)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isTradingHours = hours >= 9 && hours <= 14;
  const dayOfWeek = now.getDay(); // 0=周日, 6=周六
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let targetDate: Date;
  if (isWeekend) {
    // 如果当前是周末，顺延到下周一
    const daysToMonday = dayOfWeek === 0 ? 1 : 2;
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToMonday);
  } else if (hours >= 15 || (hours === 14 && minutes > 0 && hours === 14) || hours >= 15) {
    // 如果已经过了15:00，今天的交易日基本结束，下一个交易日为明天（如遇周末顺延）
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 1);
    // 如果明天是周末，继续顺延
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  } else if (isTradingHours) {
    // 在盘中，今天的数据预测"下一个交易日"为明天
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 1);
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  } else {
    // 开盘前 (早于 9:30) - 预测今天的数据，但用户要求的是"下一交易日"，所以用明天
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 1);
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const weekday = '日一二三四五六'[targetDate.getDay()];
  return `${y}-${m}-${d} (周${weekday})`;
}

export interface ServiceResult {
  stocks: Stock[];
  provider: string;
  errors: string[];
}

export async function fetchStockList(
  limit: number = 40
): Promise<ServiceResult> {
  const pool = getStockPool().slice(0, limit);

  const eastResult = await fetchBatchQuotes(pool);

  if (eastResult.success) {
    return {
      stocks: eastResult.data,
      provider: eastResult.provider,
      errors: [],
    };
  }

  return {
    stocks: [],
    provider: EASTMONEY_NAME,
    errors: [`${eastResult.error.provider}: ${eastResult.error.message}`],
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
      volumeRatioMin: 1.0,
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

/**
 * 核心选股逻辑：
 * 1. 按板块并发获取候选；
 * 2. 用综合评分（动量+量比+换手率-极端惩罚）排序；
 * 3. 各板块各取前 10 只。
 */
export async function fetchBoardRecommendations(
  topN: number = 10
): Promise<{ result: BoardRecommendations | null; errors: string[] }> {
  try {
    const candidates = await fetchAllBoardCandidates();

    const mainAndChiNext = candidates.mainAndChiNext.slice(0, topN);
    const star = candidates.star.slice(0, topN);
    const bse = candidates.bse.slice(0, topN);

    const totalCount = mainAndChiNext.length + star.length + bse.length;
    const errors: string[] = [];
    if (totalCount === 0) {
      errors.push('东方财富: 未获取到任何股票数据，可能是 API 响应异常或网络受限');
    }
    if (mainAndChiNext.length === 0) errors.push('主板+创业板: 无有效候选');
    if (star.length === 0) errors.push('科创板: 无有效候选');
    if (bse.length === 0) errors.push('北交所: 无有效候选');

    return {
      result: {
        mainAndChiNext,
        star,
        bse,
        nextTradingDay: getNextTradingDay(),
        provider: EASTMONEY_NAME,
        lastUpdate: Date.now(),
      },
      errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '请求失败';
    return { result: null, errors: [`${EASTMONEY_NAME}: ${message}`] };
  }
}
