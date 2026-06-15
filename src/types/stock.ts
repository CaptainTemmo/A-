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

export type StrategyType =
  | 'momentum' // 动量策略 - 强势股延续
  | 'value' // 价值投资 - 低估值
  | 'quality' // 质量因子 - ROE/毛利率
  | 'growth' // 成长策略 - 营收增长
  | 'reverse' // 反转策略 - 超跌反弹
  | 'trend' // 趋势跟踪 - 均线突破
  | 'index_enhance' // 指数增强 - 对标指数
  | 'fund_flow' // 资金流向 - 主力资金
  | 'volatility' // 波动率策略 - 布林带突破
  | 'earnings' // 业绩超预期 - 财报数据
  | 'multi_factor'; // 多因子综合

export const STRATEGY_LABELS: Record<StrategyType, string> = {
  momentum: '动量策略',
  value: '价值投资',
  quality: '质量因子',
  growth: '成长策略',
  reverse: '反转策略',
  trend: '趋势跟踪',
  index_enhance: '指数增强',
  fund_flow: '资金流向',
  volatility: '波动率',
  earnings: '业绩超预期',
  multi_factor: '多因子',
};

export const STRATEGY_DESCRIPTIONS: Record<StrategyType, string> = {
  momentum: '选择近期涨幅领先的强势股，强者恒强',
  value: '筛选低PE/PB、高股息的低估股票',
  quality: '关注ROE、毛利率、现金流等基本面指标',
  growth: '寻找营收和净利润高增长的成长股',
  reverse: '捕捉超跌后的反弹机会，均值回归',
  trend: '基于均线系统的趋势突破策略',
  index_enhance: '在指数成分股中精选优质标的',
  fund_flow: '跟踪主力资金净流入的股票',
  volatility: '利用布林带等波动率指标选股',
  earnings: '基于财报超预期的事件驱动策略',
  multi_factor: '综合多种因子的复合策略',
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
  pe_ttm: number;
  pb: number;
  ps: number;
  pcfo: number;
  dividendYield: number;
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
  strategyScore?: Record<StrategyType, number>;

  roe: number;
  grossMargin: number;
  netProfitMargin: number;
  revenueGrowth: number;
  profitGrowth: number;
  cashFlow: number;
  debtRatio: number;

  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  volatility: number;
  atr: number;
}

export interface StockFilterCriteria {
  rsiRange: [number, number];
  macdSignal: 'golden_cross' | 'death_cross' | 'neutral';
  volumeRatioMin: number;
  mainNetFlowMin: number;
  consecutiveDaysMin: number;
  marketCapRange: [number, number];
  peRange: [number, number];
  pbRange: [number, number];
  priceRange: [number, number];
  changePercentRange: [number, number];
  roeMin: number;
  grossMarginMin: number;
  revenueGrowthMin: number;
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
  type: StrategyType;
  criteria: StockFilterCriteria;
  weight: number;
  description: string;
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
  mainAndChiNext: Stock[];
  star: Stock[];
  bse: Stock[];
  nextTradingDay: string;
  provider: string;
  lastUpdate: number;
  strategyType: StrategyType;
}

export interface StrategyRecommendations {
  strategyType: StrategyType;
  strategyName: string;
  recommendations: Stock[];
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
