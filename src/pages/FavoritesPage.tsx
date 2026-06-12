import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { Badge, getChangePercentVariant, formatPercent } from '../components/common/Badge';

export function FavoritesPage() {
  const stocks = useStockStore((s) => s.stocks);
  const favorites = useStockStore((s) => s.favorites);
  const toggleFavorite = useStockStore((s) => s.toggleFavorite);

  const favoriteStocks = stocks.filter((stock) => favorites.has(stock.code));

  const formatNumber = (num: number): string => {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(2)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(2)}万`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">我的收藏</h1>
        <p className="text-gray-400">您收藏的股票共 {favoriteStocks.length} 只</p>
      </div>

      {favoriteStocks.length === 0 ? (
        <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-12 border border-white/10 text-center">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">暂无收藏</h2>
          <p className="text-gray-400 mb-6">去首页浏览并添加感兴趣的股票到收藏夹</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            浏览股票
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-primary/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    股票
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    价格
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    涨跌幅
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    换手率
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    量比
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    RSI
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    主力净流入
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {favoriteStocks.map((stock) => (
                  <tr key={stock.code} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/stock/${stock.code}`} className="flex items-center gap-3 group">
                        <div>
                          <p className="text-white font-medium group-hover:text-accent transition-colors">
                            {stock.name}
                          </p>
                          <p className="text-sm text-gray-500">{stock.code}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white font-medium">¥{stock.price.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={getChangePercentVariant(stock.changePercent)} size="md">
                        {formatPercent(stock.changePercent)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{stock.turnoverRate.toFixed(2)}%</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{stock.volumeRatio.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{stock.rsi.toFixed(1)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`font-medium ${stock.mainNetFlow >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {stock.mainNetFlow >= 0 ? '+' : ''}{formatNumber(stock.mainNetFlow)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleFavorite(stock.code)}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {favoriteStocks.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {favoriteStocks.map((stock) => (
            <Link
              key={stock.code}
              to={`/stock/${stock.code}`}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              <span className="text-white font-medium">{stock.name}</span>
              <span className="text-gray-400 text-sm ml-2">{stock.code}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
