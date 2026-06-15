import { create } from 'zustand';
import type { Stock, StockFilterCriteria, Strategy, BoardRecommendations } from '../types/stock';
import {
  fetchStockList,
  fetchStockDetail,
  fetchStockKLine,
  filterStocks as applyCriteria,
  DEFAULT_STRATEGIES,
  fetchBoardRecommendations,
} from '../api/stockService';
import { getBackendRecommendations, getBackendReview } from '../api/client';
import type { KLineData } from '../types/stock';
import type { BackendReview } from '../api/client';

interface StockState {
  stocks: Stock[];
  favorites: Set<string>;
  filterCriteria: StockFilterCriteria;
  sortBy: 'changePercent' | 'turnoverRate' | 'volumeRatio' | 'mainNetFlow' | 'rsi';
  sortOrder: 'asc' | 'desc';
  showFilter: boolean;
  strategies: Strategy[];
  loading: boolean;
  error: string | null;
  provider: string;
  lastUpdate: number | null;
  selectedStock: Stock | null;
  selectedKLine: KLineData[];

  recommendations: BoardRecommendations | null;
  recommendationsLoading: boolean;
  recommendationsError: string | null;

  review: BackendReview | null;
  reviewLoading: boolean;
  reviewError: string | null;

  refreshStocks: (limit?: number) => Promise<void>;
  loadStockDetail: (code: string, name: string) => Promise<void>;
  loadKLine: (code: string, days?: number) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshReview: () => Promise<void>;
  toggleFavorite: (code: string) => void;
  isFavorite: (code: string) => boolean;
  setFilterCriteria: (criteria: Partial<StockFilterCriteria>) => void;
  resetFilter: () => void;
  setSortBy: (sortBy: StockState['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleFilter: () => void;
  applyStrategy: (strategy: Strategy) => void;
  getFilteredStocks: () => Stock[];
  getSortedStocks: () => Stock[];
  clearSelectedStock: () => void;
}

const defaultFilterCriteria: StockFilterCriteria = {
  rsiRange: [0, 100],
  macdSignal: 'neutral',
  volumeRatioMin: 0,
  mainNetFlowMin: -10000000,
  consecutiveDaysMin: 0,
  marketCapRange: [0, Infinity],
  peRange: [0, Infinity],
  priceRange: [0, Infinity],
  changePercentRange: [-100, 100],
};

export const useStockStore = create<StockState>((set, get) => ({
  stocks: [],
  favorites: new Set(),
  filterCriteria: defaultFilterCriteria,
  sortBy: 'changePercent',
  sortOrder: 'desc',
  showFilter: false,
  strategies: DEFAULT_STRATEGIES,
  loading: false,
  error: null,
  provider: '',
  lastUpdate: null,
  selectedStock: null,
  selectedKLine: [],

  recommendations: null,
  recommendationsLoading: false,
  recommendationsError: null,

  review: null,
  reviewLoading: false,
  reviewError: null,

  refreshStocks: async (limit = 40) => {
    set({ loading: true, error: null });
    try {
      const result = await fetchStockList(limit);
      if (result.stocks.length === 0) {
        set({
          loading: false,
          error: result.errors.length > 0
            ? `数据源错误: ${result.errors.join('; ')}`
            : '未能获取到股票数据，请检查网络或稍后重试',
          provider: result.provider,
        });
        return;
      }
      set({
        stocks: result.stocks,
        loading: false,
        provider: result.provider,
        lastUpdate: Date.now(),
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '请求失败',
      });
    }
  },

  refreshRecommendations: async () => {
    set({ recommendationsLoading: true, recommendationsError: null });

    // Step 1: 优先从后端 API 获取
    try {
      const backendData = await getBackendRecommendations();
      if (backendData && backendData.recommendation) {
        const rec = backendData.recommendation;
        const recommendations: BoardRecommendations = {
          mainAndChiNext: rec.main_chinext as unknown as Stock[],
          star: rec.star as unknown as Stock[],
          bse: rec.bse as unknown as Stock[],
          nextTradingDay: rec.next_trading_day,
          provider: '东方财富(后端)',
          lastUpdate: new Date(rec.created_at).getTime(),
        };
        set({ recommendations, recommendationsLoading: false });

        // 如果后端有复盘数据，也一并更新
        if (backendData.review) {
          set({ review: backendData.review });
        }
        return;
      }
    } catch {
      // 后端不可用，继续用前端直连
    }

    // Step 2: 降级到前端直连东方财富
    try {
      const { result, errors } = await fetchBoardRecommendations(10);
      if (!result || (result.mainAndChiNext.length === 0 && result.star.length === 0 && result.bse.length === 0)) {
        set({
          recommendationsLoading: false,
          recommendationsError: errors.length > 0
            ? errors.join('; ')
            : '未能获取到板块推荐，请检查网络或稍后重试',
        });
        return;
      }
      set({ recommendations: result, recommendationsLoading: false });
    } catch (err) {
      set({
        recommendationsLoading: false,
        recommendationsError: err instanceof Error ? err.message : '请求失败',
      });
    }
  },

  refreshReview: async () => {
    set({ reviewLoading: true, reviewError: null });
    try {
      const backendReview = await getBackendReview();
      if (backendReview) {
        set({ review: backendReview, reviewLoading: false });
      } else {
        set({ reviewLoading: false, reviewError: '暂无复盘数据（需部署后端服务后自动生成）' });
      }
    } catch (err) {
      set({
        reviewLoading: false,
        reviewError: err instanceof Error ? err.message : '获取复盘失败',
      });
    }
  },

  loadStockDetail: async (code: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const result = await fetchStockDetail(code, name);
      if (!result.success) {
        set({
          loading: false,
          error: `${result.error.provider}: ${result.error.message}`,
        });
        return;
      }
      set({ selectedStock: result.data, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '请求失败',
      });
    }
  },

  loadKLine: async (code: string, days = 60) => {
    set({ loading: true });
    try {
      const result = await fetchStockKLine(code, days);
      if (!result.success) {
        set({
          loading: false,
          error: `${result.error.provider}: ${result.error.message}`,
          selectedKLine: [],
        });
        return;
      }
      set({ selectedKLine: result.data, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '请求失败',
        selectedKLine: [],
      });
    }
  },

  clearSelectedStock: () => set({ selectedStock: null, selectedKLine: [] }),

  toggleFavorite: (code) =>
    set((state) => {
      const newFavorites = new Set(state.favorites);
      if (newFavorites.has(code)) {
        newFavorites.delete(code);
      } else {
        newFavorites.add(code);
      }
      return { favorites: newFavorites };
    }),

  isFavorite: (code) => get().favorites.has(code),

  setFilterCriteria: (criteria) =>
    set((state) => ({
      filterCriteria: { ...state.filterCriteria, ...criteria },
    })),

  resetFilter: () => set({ filterCriteria: defaultFilterCriteria }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (order) => set({ sortOrder: order }),

  toggleFilter: () => set((state) => ({ showFilter: !state.showFilter })),

  applyStrategy: (strategy) =>
    set({ filterCriteria: strategy.criteria }),

  getFilteredStocks: () => {
    const { stocks, filterCriteria } = get();
    return applyCriteria(stocks, filterCriteria);
  },

  getSortedStocks: () => {
    const filteredStocks = get().getFilteredStocks();
    const { sortBy, sortOrder } = get();

    return [...filteredStocks].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  },
}));
