export interface Stock {
  code: string;
  name: string;
  price: number;
  changePercent: number;
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
