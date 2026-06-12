import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, TrendingUp, TrendingDown, Volume2, DollarSign } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { generateKLineData } from '../data/mockStocks';
import { KLineChart } from '../components/stock/KLineChart';
import { FundFlowChart } from '../components/indicators/FundFlowChart';
import { IndicatorPanel } from '../components/indicators/IndicatorPanel';
import { Badge, getChangePercentVariant, formatPercent } from '../components/common/Badge';
import { Button } from '../components/ui/Button';

export function StockDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const stocks = useStockStore((s) => s.stocks);
  const toggleFavorite = useStockStore((s) => s.toggleFavorite);
  const favorites = useStockStore((s) => s.favorites);

  const stock = stocks.find((s) => s.code === code);
  const favorite = stock ? favorites.has(stock.code) : false;

  if (!stock) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">股票不存在</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  const kLineData = generateKLineData(stock, 30);

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
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{stock.name}</h1>
            <Badge variant="neutral" size="md">{stock.code}</Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">实时行情 · 数据仅供参考</p>
        </div>
        <Button
          variant={favorite ? 'primary' : 'secondary'}
          onClick={() => toggleFavorite(stock.code)}
        >
          <Heart className={`w-4 h-4 mr-2 ${favorite ? 'fill-current' : ''}`} />
          {favorite ? '已收藏' : '收藏'}
        </Button>
      </div>

      {/* Stock Overview */}
      <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stock.changePercent >= 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              {stock.changePercent >= 0 ? (
                <TrendingUp className="w-6 h-6 text-red-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-green-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">当前价格</p>
              <p className="text-2xl font-bold text-white">¥{stock.price.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">涨跌幅</p>
            <div className="flex items-center gap-2">
              <Badge variant={getChangePercentVariant(stock.changePercent)} size="lg">
                {formatPercent(stock.changePercent)}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">成交量</p>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-semibold text-white">{formatNumber(stock.volume)}</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">市值</p>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-semibold text-white">{(stock.marketCap / 100000000).toFixed(2)}亿</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">换手率</p>
            <p className="text-sm font-medium text-white">{stock.turnoverRate.toFixed(2)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">量比</p>
            <p className="text-sm font-medium text-white">{stock.volumeRatio.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">市盈率 (PE)</p>
            <p className="text-sm font-medium text-white">{stock.pe.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">主力净流入</p>
            <p className={`text-sm font-medium ${stock.mainNetFlow >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stock.mainNetFlow >= 0 ? '+' : ''}{formatNumber(stock.mainNetFlow)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">K线图</h3>
            <KLineChart data={kLineData} height={350} />
          </div>
        </div>
        <div>
          <IndicatorPanel stock={stock} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FundFlowChart height="300px" />
      </div>

      {/* Selection Reasons */}
      {stock.selectionReasons && stock.selectionReasons.length > 0 && (
        <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">入选原因</h3>
          <div className="flex flex-wrap gap-3">
            {stock.selectionReasons.map((reason, index) => (
              <Badge key={index} variant="info" size="md">
                {reason}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
