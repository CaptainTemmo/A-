/**
 * 前端 API 客户端
 * 优先从后端服务器获取数据，后端不可用时降级到前端直连东方财富
 */

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export type StrategyType =
  | 'momentum'
  | 'value'
  | 'quality'
  | 'growth'
  | 'reverse'
  | 'trend'
  | 'index_enhance'
  | 'fund_flow'
  | 'volatility'
  | 'earnings'
  | 'multi_factor';

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

interface StockItem {
  code: string;
  name: string;
  board: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  volume: number;
  turnoverRate: number;
  volumeRatio: number;
  marketCap: number;
  pe: number;
  mainNetFlow: number;
  selectionReasons: string[];
  score: number;
}

interface BackendRecommendation {
  id: number;
  trade_date: string;
  strategy_type: StrategyType;
  strategy_name: string;
  next_trading_day: string;
  created_at: string;
  main_chinext: StockItem[];
  star: StockItem[];
  bse: StockItem[];
  total_count: number;
  status: string;
}

interface BackendReview {
  id: number;
  trade_date: string;
  reviewed_at: string;
  review_data: {
    reviewDate: string;
    totalCount: number;
    hitRate: string;
    beatRate: string;
    surpriseRate: string;
    verdicts: Record<string, number>;
    items: Array<{
      code: string;
      name: string;
      board: string;
      recommendedChange: number;
      actualChangePercent: number;
      performance: string;
      verdict: string;
      analysis: string;
      relevantNews?: Array<{ title: string; time: string; source: string }>;
    }>;
    generatedAt: string;
    strategyType: StrategyType;
    strategyName: string;
  };
}

export async function fetchFromBackend<T>(path: string): Promise<ApiResponse<T> | null> {
  if (!BACKEND_URL) return null;
  try {
    const resp = await fetch(`${BACKEND_URL}${path}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    return await resp.json() as ApiResponse<T>;
  } catch {
    return null;
  }
}

export async function getBackendRecommendations(strategyType?: StrategyType): Promise<{
  recommendation: BackendRecommendation | null;
  review: BackendReview | null;
}> {
  const path = strategyType 
    ? `/api/recommendations/latest?strategy=${strategyType}` 
    : '/api/recommendations/latest';
  
  const result = await fetchFromBackend<{
    recommendation: BackendRecommendation;
    review: BackendReview | null;
    meta: Record<string, unknown>;
  }>(path);

  if (!result || !result.success || !result.data) {
    return { recommendation: null, review: null };
  }
  return result.data;
}

export async function getBackendReview(): Promise<BackendReview | null> {
  const result = await fetchFromBackend<BackendReview>('/api/reviews/latest');
  if (!result || !result.success || !result.data) return null;
  return result.data;
}

export async function getAllStrategyRecommendations(): Promise<BackendRecommendation[]> {
  const result = await fetchFromBackend<BackendRecommendation[]>('/api/recommendations/all');
  if (!result || !result.success || !result.data) return [];
  return result.data;
}

export { BACKEND_URL };
export type { BackendRecommendation, BackendReview };
