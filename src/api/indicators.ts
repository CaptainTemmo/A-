import type { KLineData } from '../types/stock';

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[prices.length - i] - prices[prices.length - i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MACDResult {
  dif: number;
  dea: number;
  histogram: number;
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  if (prices.length < slowPeriod + signalPeriod) {
    return { dif: 0, dea: 0, histogram: 0 };
  }

  const ema = (data: number[], period: number): number[] => {
    const result: number[] = [];
    const k = 2 / (period + 1);
    let prev = data[0];
    for (let i = 0; i < data.length; i++) {
      prev = i === 0 ? data[0] : data[i] * k + prev * (1 - k);
      result.push(prev);
    }
    return result;
  };

  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  const dif: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    dif.push(fastEMA[i] - slowEMA[i]);
  }

  const dea = ema(dif, signalPeriod);

  const lastDif = dif[dif.length - 1] || 0;
  const lastDea = dea[dea.length - 1] || 0;

  return {
    dif: Math.round(lastDif * 1000) / 1000,
    dea: Math.round(lastDea * 1000) / 1000,
    histogram: Math.round((lastDif - lastDea) * 1000) / 1000,
  };
}

export interface KDJResult {
  k: number;
  d: number;
  j: number;
}

export function calculateKDJ(
  klines: KLineData[],
  period: number = 9
): KDJResult {
  if (klines.length < period) return { k: 50, d: 50, j: 50 };

  let lastK = 50;
  let lastD = 50;

  for (let i = 0; i < klines.length; i++) {
    const start = Math.max(0, i - period + 1);
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = start; j <= i; j++) {
      if (klines[j].high > highestHigh) highestHigh = klines[j].high;
      if (klines[j].low < lowestLow) lowestLow = klines[j].low;
    }

    if (highestHigh === lowestLow) continue;

    const rsv = ((klines[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
    lastK = (2 / 3) * lastK + (1 / 3) * rsv;
    lastD = (2 / 3) * lastD + (1 / 3) * lastK;
  }

  const j = 3 * lastK - 2 * lastD;

  return {
    k: Math.round(lastK * 100) / 100,
    d: Math.round(lastD * 100) / 100,
    j: Math.round(j * 100) / 100,
  };
}

export interface BollResult {
  upper: number;
  middle: number;
  lower: number;
}

export function calculateBoll(
  klines: KLineData[],
  period: number = 20,
  multiplier: number = 2
): BollResult {
  if (klines.length < period) {
    const lastPrice = klines[klines.length - 1]?.close || 0;
    return {
      upper: lastPrice * 1.03,
      middle: lastPrice,
      lower: lastPrice * 0.97,
    };
  }

  const closes: number[] = [];
  for (let i = klines.length - period; i < klines.length; i++) {
    closes.push(klines[i].close);
  }

  const mean = closes.reduce((a, b) => a + b, 0) / period;

  let variance = 0;
  for (const c of closes) {
    variance += (c - mean) * (c - mean);
  }
  const std = Math.sqrt(variance / period);

  return {
    upper: Math.round(mean + multiplier * std * 100) / 100,
    middle: Math.round(mean * 100) / 100,
    lower: Math.round(mean - multiplier * std * 100) / 100,
  };
}
