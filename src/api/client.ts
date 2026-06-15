/**
 * 前端 API 客户端
 * 优先从后端服务器获取数据，后端不可用时降级到前端直连东方财富
 */

// 后端 API 地址，部署后端后将此设为 Railway 分配的域名
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

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
  };
}

export async function fetchFromBackend<T>(path: string): Promise<ApiResponse<T> | null> {
  if (!BACKEND_URL) return null;
  try {
    const resp = await fetch(`${BACKEND_URL}${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return await resp.json() as ApiResponse<T>;
  } catch {
    return null;
  }
}

export async function getBackendRecommendations(): Promise<{
  recommendation: BackendRecommendation | null;
  review: BackendReview | null;
}> {
  const result = await fetchFromBackend<{
    recommendation: BackendRecommendation;
    review: BackendReview | null;
    meta: Record<string, unknown>;
  }>('/api/recommendations/latest');

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

export { BACKEND_URL };
export type { BackendRecommendation, BackendReview };
