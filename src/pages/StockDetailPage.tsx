import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, TrendingUp, TrendingDown, Volume2, DollarSign, RefreshCw } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { KLineChart } from '../components/stock/KLineChart';
import { FundFlowChart } from '../components/indicators/FundFlowChart';
import { IndicatorPanel } from '../components/indicators/IndicatorPanel';
import { Badge, getChangePercentVariant, formatPercent } from '../components/common/Badge';
import { Button } from '../components/ui/Button';
import { calculateFundFlowData } from '../api/stockService';

export function StockDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const stocks = useStockStore((s) => s.stocks);
  const selectedStock = useStockStore((s) => s.selectedStock);
  const selectedKLine = useStockStore((s) => s.selectedKLine);
  const loading = useStockStore((s) => s.loading);
  const error = useStockStore((s) => s.error);
  const toggleFavorite = useStockStore((s) => s.toggleFavorite);
  const favorites = useStockStore((s) => s.favorites);
  const loadStockDetail = useStockStore((s) => s.loadStockDetail);
  const loadKLine = useStockStore((s) => s.loadKLine);

  const stock = selectedStock || stocks.find((s) => s.code === code);
  const favorite = stock ? favorites.has(stock.code) : false;

  useEffect(() => {
    if (code) {
      if (!stock || !stock.name) {
        loadStockDetail(code, '');
      }
      loadKLine(code, 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const formatNumber = (num: number): string => {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(2)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(2)}万`;
    }
    return num.toLocaleString();
  };

  if (!stock) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl font-semibold text-white">加载中...</h1>
        </div>

        {error ? (
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-12 border border-white/10 text-center">
            <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">无法加载股票数据</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" onClick={() => navigate('/')}>
                返回首页
              </Button>
              <Button
                variant="primary"
                onClick={() => code && loadStockDetail(code, '')}
              >
                重新加载
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-12 border border-white/10 text-center">
            <RefreshCw className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
            <p className="text-white text-lg font-medium mb-2">正在获取股票详情...</p>
            <p className="text-gray-400 text-sm">代码: {code}</p>
          </div>
        )}
      </div>
    );
  }

  const fundFlowData = calculateFundFlowData(selectedKLine);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center gap-4 mb-6">
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
          <p className="text-sm text-gray-400 mt-1">
            实时行情 · 数据仅供参考 · 更新于 {new Date(stock.lastUpdate || Date.now()).toLocaleString('zh-CN')}
          </p>
        </div>
        <Button
          variant={favorite ? 'primary' : 'secondary'}
          onClick={() => toggleFavorite(stock.code)}
        >
          <Heart className={`w-4 h-4 mr-2 ${favorite ? 'fill-current' : ''}`} />
          {favorite ? '已收藏' : '收藏'}
        </Button>
      </div>

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
              <span className="text-lg font-semibold text-white">
                {stock.marketCap >= 100000000
                  ? `${(stock.marketCap / 100000000).toFixed(2)}亿`
                  : stock.marketCap.toLocaleString()}
              </span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">K线图 ({selectedKLine.length} 日)</h3>
            {selectedKLine.length > 0 ? (
              <KLineChart data={selectedKLine} height={400} />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400">
                {loading ? '正在加载 K 线数据...' : '暂无 K 线数据'}
              </div>
            )}
          </div>
        </div>
        <div>
          <IndicatorPanel stock={stock} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {fundFlowData && fundFlowData.length > 0 ? (
          <FundFlowChart data={fundFlowData} height="300px" />
        ) : (
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">资金流向</h3>
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              暂无资金流向数据
            </div>
          </div>
        )}
      </div>

      {stock.selectionReasons && stock.selectionReasons.length > 0 && (
        <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">技术指标解读</h3>
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
