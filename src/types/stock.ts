export type BoardCategory =
  | 'main' // 主板 (沪市主板 + 深市主板)
  | 'chinext' // 创业板 (300xxx)
  | 'star' // 科创板 (688xxx)
  | 'bse'; // 北交所 (83xxx, 87xxx, 88xxx, 92xxx)

export const BOARD_LABELS: Record<BoardCategory, string> = {
  main: '主板',
  chinext: '创业板',
  star: '科创板',
  bse: '北交所',
};

export const BOARD_DESCRIPTIONS: Record<BoardCategory, string> = {
  main: '沪市主板 + 深市主板',
  chinext: '创业板 300xxx',
  star: '科创板 688xxx',
  bse: '北交所 83/87/88/92xxx',
};

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
  board?: BoardCategory;
  score?: number;
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

export interface BoardRecommendations {
  mainAndChiNext: Stock[]; // 主板+创业板 10只
  star: Stock[]; // 科创板 10只
  bse: Stock[]; // 北交所 10只
  nextTradingDay: string;
  provider: string;
  lastUpdate: number;
}

export function detectBoardByCode(code: string): BoardCategory {
  if (code.startsWith('688')) return 'star';
  if (code.startsWith('83') || code.startsWith('87') || code.startsWith('88') || code.startsWith('92')) {
    return 'bse';
  }
  if (code.startsWith('300') || code.startsWith('301')) return 'chinext';
  return 'main';
}
