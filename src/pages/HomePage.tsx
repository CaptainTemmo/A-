import { useEffect, useMemo } from 'react';
import { Coins, TrendingUp, Activity, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { StatCard } from '../components/common/StatCard';
import { StockList } from '../components/stock/StockList';
import { Button } from '../components/ui/Button';

export function HomePage() {
  const stocks = useStockStore((state) => state.stocks);
  const loading = useStockStore((state) => state.loading);
  const error = useStockStore((state) => state.error);
  const provider = useStockStore((state) => state.provider);
  const lastUpdate = useStockStore((state) => state.lastUpdate);
  const refreshStocks = useStockStore((state) => state.refreshStocks);

  useEffect(() => {
    if (stocks.length === 0) {
      refreshStocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalStocks = stocks.length;
    const avgChange = totalStocks > 0
      ? stocks.reduce((sum, s) => sum + s.changePercent, 0) / totalStocks
      : 0;
    const totalNetFlow = stocks.reduce((sum, s) => sum + s.mainNetFlow, 0);
    const avgTurnover = totalStocks > 0
      ? stocks.reduce((sum, s) => sum + s.turnoverRate, 0) / totalStocks
      : 0;
    return { totalStocks, avgChange, totalNetFlow, avgTurnover };
  }, [stocks]);

  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 100000000) {
      return `${value >= 0 ? '' : '-'}${(absValue / 100000000).toFixed(2)}亿`;
    }
    if (absValue >= 10000) {
      return `${value >= 0 ? '' : '-'}${(absValue / 10000).toFixed(2)}万`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">今日精选</h1>
          <p className="text-gray-400">基于技术指标和资金流向智能筛选的优质 A 股</p>
          {provider && (
            <p className="text-xs text-gray-500 mt-1">
              数据来源: {provider}
              {lastUpdate && ` · 更新于 ${new Date(lastUpdate).toLocaleString('zh-CN')}`}
            </p>
          )}
        </div>
        <Button
          variant="primary"
          onClick={() => refreshStocks()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '加载中...' : '刷新数据'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">数据加载失败</p>
              <p className="text-sm text-red-300/80 mt-1">{error}</p>
              <p className="text-xs text-gray-400 mt-2">
                提示: 浏览器 CORS 限制可能导致无法直接调用东方财富 API。
                如持续失败，请检查网络，或稍后重试。
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && stocks.length === 0 && (
        <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-12 border border-white/10 text-center">
          <RefreshCw className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg font-medium mb-2">正在获取实时行情...</p>
          <p className="text-gray-400 text-sm">首次加载可能需要几秒钟</p>
        </div>
      )}

      {(stocks.length > 0 || (!loading && !error)) && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="股票总数"
              value={stats.totalStocks}
              icon={Coins}
              suffix="只"
            />
            <StatCard
              title="平均涨跌幅"
              value={stats.avgChange.toFixed(2)}
              icon={TrendingUp}
              trend={{
                value: Math.abs(stats.avgChange),
                isPositive: stats.avgChange >= 0
              }}
              suffix="%"
            />
            <StatCard
              title="主力净流入"
              value={formatCurrency(stats.totalNetFlow)}
              icon={Activity}
              trend={{
                value: 0,
                isPositive: stats.totalNetFlow >= 0
              }}
            />
            <StatCard
              title="平均换手率"
              value={stats.avgTurnover.toFixed(2)}
              icon={BarChart3}
              suffix="%"
            />
          </div>

          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-6">选股结果</h2>
            <StockList />
          </div>
        </>
      )}
    </div>
  );
}
