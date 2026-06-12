export interface Stock {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  volume: number;
  turnover: number;
  turnoverRate: number;
  volumeRatio: number;
  marketCap: number;
  pe: number;
  rsi: number;
  macd: { dif: number; dea: number; histogram: number; };
  kdj: { k: number; d: number; j: number; };
  boll: { upper: number; middle: number; lower: number; };
  mainNetFlow: number;
  fiveDayNetFlow: number;
  tenDayNetFlow: number;
  selectionReasons: string[];
  lastUpdate: number;
}

export interface StockFilterCriteria {
  rsiRange: [number, number];
  macdSignal: 'golden_cross' | 'death_cross' | 'neutral';
  volumeRatioMin: number;
  mainNetFlowMin: number;
  consecutiveDaysMin: number;
  marketCapRange: [number, number];
  peRange: [number, number];
  priceRange: [number, number];
  changePercentRange: [number, number];
}

export interface UserFavorite {
  stockCode: string;
  addedAt: Date;
  alertPrice?: number;
}

export interface SelectionHistory {
  date: string;
  stocks: Stock[];
}

export interface Strategy {
  id: string;
  name: string;
  type: 'conservative' | 'aggressive' | 'value';
  criteria: StockFilterCriteria;
}

export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface FundFlowData {
  date: string;
  mainFlow: number;
  fiveDayFlow: number;
  tenDayFlow: number;
}

export interface ApiError {
  code: string;
  message: string;
  provider: string;
  raw?: unknown;
}

export type ApiResult<T> =
  | { success: true; data: T; provider: string }
  | { success: false; error: ApiError };

export interface StockQuote {
  code: string;
  name: string;
  price: number;
  open: number;
  preClose: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  turnoverRate: number;
  volumeRatio: number;
  marketCap: number;
  pe: number;
  changePercent: number;
  changeAmount: number;
}
