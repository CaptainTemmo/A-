import { create } from 'zustand';
import type { Stock, StockFilterCriteria, Strategy } from '../types/stock';

interface StockState {
  stocks: Stock[];
  favorites: Set<string>;
  filterCriteria: StockFilterCriteria;
  sortBy: 'changePercent' | 'turnoverRate' | 'volumeRatio' | 'mainNetFlow' | 'rsi';
  sortOrder: 'asc' | 'desc';
  showFilter: boolean;
  strategies: Strategy[];
  
  setStocks: (stocks: Stock[]) => void;
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
}

const defaultFilterCriteria: StockFilterCriteria = {
  rsiRange: [0, 100],
  macdSignal: 'neutral',
  volumeRatioMin: 0,
  mainNetFlowMin: 0,
  consecutiveDaysMin: 0,
  marketCapRange: [0, Infinity],
  peRange: [0, Infinity],
  priceRange: [0, Infinity],
  changePercentRange: [-100, 100],
};

const defaultStrategies: Strategy[] = [
  {
    id: 'conservative',
    name: '稳健型',
    type: 'conservative',
    criteria: {
      rsiRange: [30, 70],
      macdSignal: 'neutral',
      volumeRatioMin: 0.5,
      mainNetFlowMin: 100000000,
      consecutiveDaysMin: 3,
      marketCapRange: [100000000000, Infinity],
      peRange: [0, 30],
      priceRange: [0, Infinity],
      changePercentRange: [-5, 5],
    },
  },
  {
    id: 'aggressive',
    name: '激进型',
    type: 'aggressive',
    criteria: {
      rsiRange: [0, 100],
      macdSignal: 'neutral',
      volumeRatioMin: 1.5,
      mainNetFlowMin: 0,
      consecutiveDaysMin: 1,
      marketCapRange: [0, Infinity],
      peRange: [0, Infinity],
      priceRange: [0, Infinity],
      changePercentRange: [-100, 100],
    },
  },
  {
    id: 'value',
    name: '价值型',
    type: 'value',
    criteria: {
      rsiRange: [0, 60],
      macdSignal: 'neutral',
      volumeRatioMin: 0,
      mainNetFlowMin: 500000000,
      consecutiveDaysMin: 5,
      marketCapRange: [500000000000, Infinity],
      peRange: [0, 15],
      priceRange: [0, Infinity],
      changePercentRange: [-10, 10],
    },
  },
];

export const useStockStore = create<StockState>((set, get) => ({
  stocks: [],
  favorites: new Set(),
  filterCriteria: defaultFilterCriteria,
  sortBy: 'changePercent',
  sortOrder: 'desc',
  showFilter: false,
  strategies: defaultStrategies,

  setStocks: (stocks) => set({ stocks }),

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
    return stocks.filter((stock) => {
      if (stock.rsi < filterCriteria.rsiRange[0] || stock.rsi > filterCriteria.rsiRange[1]) {
        return false;
      }
      if (stock.volumeRatio < filterCriteria.volumeRatioMin) {
        return false;
      }
      if (stock.mainNetFlow < filterCriteria.mainNetFlowMin) {
        return false;
      }
      if (stock.marketCap < filterCriteria.marketCapRange[0] || stock.marketCap > filterCriteria.marketCapRange[1]) {
        return false;
      }
      if (stock.pe < filterCriteria.peRange[0] || stock.pe > filterCriteria.peRange[1]) {
        return false;
      }
      if (stock.changePercent < filterCriteria.changePercentRange[0] || stock.changePercent > filterCriteria.changePercentRange[1]) {
        return false;
      }
      return true;
    });
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