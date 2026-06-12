import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStockStore } from '../../store/stockStore';
import { Badge, getChangePercentVariant, formatPercent } from '../common/Badge';
import type { Stock } from '../../types/stock';

interface StockCardProps {
  stock: Stock;
}

const formatCurrency = (num: number): string => {
  if (num >= 100000000) {
    return `¥${(num / 100000000).toFixed(2)}亿`;
  }
  if (num >= 10000) {
    return `¥${(num / 10000).toFixed(2)}万`;
  }
  return `¥${num.toFixed(2)}`;
};

export const StockCard: React.FC<StockCardProps> = ({ stock }) => {
  const { toggleFavorite, isFavorite } = useStockStore();
  const favorite = isFavorite(stock.code);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(stock.code);
  };

  return (
    <Link
      to={`/stock/${stock.code}`}
      className="block bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-lg p-4 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{stock.name}</h3>
          <span className="text-sm text-gray-400">{stock.code}</span>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`p-1.5 rounded-full transition-colors ${
            favorite
              ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20'
              : 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
          }`}
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl font-bold text-white">
          ¥{stock.price.toFixed(2)}
        </span>
        <Badge variant={getChangePercentVariant(stock.changePercent)} size="lg">
          {formatPercent(stock.changePercent)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900/50 rounded p-2">
          <span className="text-xs text-gray-500 block">换手率</span>
          <span className="text-sm font-medium text-white">{stock.turnoverRate.toFixed(2)}%</span>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <span className="text-xs text-gray-500 block">量比</span>
          <span className="text-sm font-medium text-white">{stock.volumeRatio.toFixed(2)}</span>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <span className="text-xs text-gray-500 block">RSI</span>
          <span className="text-sm font-medium text-white">{stock.rsi.toFixed(1)}</span>
        </div>
        <div className="bg-gray-900/50 rounded p-2">
          <span className="text-xs text-gray-500 block">主力净流入</span>
          <span className={`text-sm font-medium ${stock.mainNetFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(stock.mainNetFlow)}
          </span>
        </div>
      </div>

      {stock.selectionReasons && stock.selectionReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stock.selectionReasons.map((reason, index) => (
            <Badge key={index} variant="info" size="sm">
              {reason}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
};