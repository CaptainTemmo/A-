import React, { useMemo } from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';
import { useStockStore } from '../../store/stockStore';
import { StockCard } from './StockCard';
import { StockFilter } from './StockFilter';

type SortField = 'changePercent' | 'turnoverRate' | 'volumeRatio' | 'mainNetFlow' | 'rsi';

const sortLabels: Record<SortField, string> = {
  changePercent: '涨跌幅',
  turnoverRate: '换手率',
  volumeRatio: '量比',
  mainNetFlow: '主力净流入',
  rsi: 'RSI',
};

export const StockList: React.FC = () => {
  const sortBy = useStockStore((s) => s.sortBy);
  const sortOrder = useStockStore((s) => s.sortOrder);
  const setSortBy = useStockStore((s) => s.setSortBy);
  const setSortOrder = useStockStore((s) => s.setSortOrder);
  const showFilter = useStockStore((s) => s.showFilter);
  const toggleFilter = useStockStore((s) => s.toggleFilter);
  const stocks = useStockStore((s) => s.stocks);

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (sortOrder === 'asc') return aValue - bValue;
      return bValue - aValue;
    });
  }, [stocks, sortBy, sortOrder]);

  const handleSortClick = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">排序:</span>
          {(Object.keys(sortLabels) as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => handleSortClick(field)}
              className={`
                px-3 py-1.5 text-sm rounded-md border transition-colors
                ${
                  sortBy === field
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }
              `}
            >
              {sortLabels[field]}
              {sortBy === field && (
                <ArrowUpDown size={14} className="inline ml-1" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={toggleFilter}
          className={`
            ml-auto flex items-center gap-2 px-4 py-1.5 text-sm rounded-md border transition-colors
            ${
              showFilter
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
            }
          `}
        >
          <Filter size={16} />
          筛选
        </button>
      </div>

      {showFilter && <StockFilter />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedStocks.map((stock) => (
          <StockCard key={stock.code} stock={stock} />
        ))}
      </div>

      {sortedStocks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无符合条件的股票
        </div>
      )}
    </div>
  );
};