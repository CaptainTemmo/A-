import { useEffect } from 'react';
import { Coins, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { generateMockStocks } from '../data/mockStocks';
import { StatCard } from '../components/common/StatCard';
import { StockList } from '../components/stock/StockList';

export function HomePage() {
  const { stocks, setStocks } = useStockStore();

  useEffect(() => {
    if (stocks.length === 0) {
      const mockStocks = generateMockStocks();
      setStocks(mockStocks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useStockStore((state) => {
    const allStocks = state.stocks;
    const totalStocks = allStocks.length;
    const avgChange = allStocks.length > 0
      ? allStocks.reduce((sum, s) => sum + s.changePercent, 0) / totalStocks
      : 0;
    const totalNetFlow = allStocks.reduce((sum, s) => sum + s.mainNetFlow, 0);
    const avgTurnover = allStocks.length > 0
      ? allStocks.reduce((sum, s) => sum + s.turnoverRate, 0) / totalStocks
      : 0;

    return { totalStocks, avgChange, totalNetFlow, avgTurnover };
  });

  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 100000000) {
      return `${value >= 0 ? '' : '-'}${absValue / 100000000}亿`;
    }
    if (absValue >= 10000) {
      return `${value >= 0 ? '' : '-'}${absValue / 10000}万`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">今日精选</h1>
        <p className="text-gray-400">基于技术指标和资金流向智能筛选的优质股票</p>
      </div>

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
    </div>
  );
}
