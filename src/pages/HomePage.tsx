import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle, ArrowRight, Lock, Unlock, TrendingUp } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { Button } from '../components/ui/Button';
import type { Stock } from '../types/stock';
import { BOARD_LABELS } from '../types/stock';

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 100000000) {
    return `${value >= 0 ? '' : '-'}${(absValue / 100000000).toFixed(2)}亿`;
  }
  if (absValue >= 10000) {
    return `${value >= 0 ? '' : '-'}${(absValue / 10000).toFixed(2)}万`;
  }
  return value.toFixed(2);
}

interface BoardColumnProps {
  title: string;
  subtitle: string;
  stocks: Stock[];
  hasPermission: boolean;
  accentClass: string;
  onClickStock: (stock: Stock) => void;
}

function BoardColumn({ title, subtitle, stocks, hasPermission, accentClass, onClickStock }: BoardColumnProps) {
  return (
    <div className="bg-primary/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden flex flex-col">
      <div className={`p-4 border-b border-white/10 ${accentClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {title}
              {hasPermission ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
            {stocks.length} 只
          </span>
        </div>
        {!hasPermission && (
          <p className="text-[11px] text-amber-400/90 mt-2 leading-relaxed">
            ⚠ 当前账户未开通该板块交易权限，推荐仅作参考学习
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="bg-white/5 sticky top-0">
            <tr className="text-gray-400 text-xs">
              <th className="text-left font-medium px-3 py-2 w-8">#</th>
              <th className="text-left font-medium px-3 py-2">股票</th>
              <th className="text-right font-medium px-3 py-2">最新价</th>
              <th className="text-right font-medium px-3 py-2">涨跌幅</th>
              <th className="text-right font-medium px-3 py-2">量比</th>
              <th className="text-right font-medium px-3 py-2 hidden lg:table-cell">主力</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, idx) => {
              const changeColor = stock.changePercent >= 0 ? 'text-red-400' : 'text-emerald-400';
              const changeSign = stock.changePercent >= 0 ? '+' : '';
              return (
                <tr
                  key={stock.code}
                  onClick={() => onClickStock(stock)}
                  className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="text-white font-medium">{stock.name}</div>
                    <div className="text-xs text-gray-500">{stock.code}</div>
                  </td>
                  <td className="px-3 py-3 text-right text-white font-mono">
                    {stock.price.toFixed(2)}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono font-medium ${changeColor}`}>
                    {changeSign}{stock.changePercent.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3 text-right text-gray-300 font-mono">
                    {stock.volumeRatio.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-300 font-mono hidden lg:table-cell">
                    {formatCurrency(stock.mainNetFlow)}
                  </td>
                </tr>
              );
            })}
            {stocks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500 text-sm">
                  暂无推荐
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const recommendations = useStockStore((state) => state.recommendations);
  const recommendationsLoading = useStockStore((state) => state.recommendationsLoading);
  const recommendationsError = useStockStore((state) => state.recommendationsError);
  const refreshRecommendations = useStockStore((state) => state.refreshRecommendations);

  useEffect(() => {
    if (!recommendations) {
      refreshRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickStock = (stock: Stock) => {
    navigate(`/stock/${stock.code}`, { state: { name: stock.name } });
  };

  const hasData = recommendations && (
    recommendations.mainAndChiNext.length > 0 ||
    recommendations.star.length > 0 ||
    recommendations.bse.length > 0
  );

  const stats = useMemo(() => {
    if (!recommendations) return { total: 0, avgChange: 0 };
    const all = [
      ...recommendations.mainAndChiNext,
      ...recommendations.star,
      ...recommendations.bse,
    ];
    const avgChange = all.length > 0
      ? all.reduce((sum, s) => sum + s.changePercent, 0) / all.length
      : 0;
    return { total: all.length, avgChange };
  }, [recommendations]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            下一交易日 · 板块选股
          </h1>
          <p className="text-gray-400 text-sm">
            基于动量 + 量比 + 换手率综合评分，从全市场筛选潜力股
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            {recommendations && (
              <>
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-accent" />
                  推荐目标日: <span className="text-accent">{recommendations.nextTradingDay}</span>
                </span>
                <span className="text-gray-600">|</span>
                <span>数据来源: {recommendations.provider}</span>
                <span className="text-gray-600">|</span>
                <span>更新时间: {new Date(recommendations.lastUpdate).toLocaleString('zh-CN')}</span>
              </>
            )}
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => refreshRecommendations()}
          disabled={recommendationsLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${recommendationsLoading ? 'animate-spin' : ''}`} />
          {recommendationsLoading ? '加载中...' : '刷新推荐'}
        </Button>
      </div>

      {recommendationsError && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium text-sm">数据加载失败</p>
              <p className="text-xs text-red-300/80 mt-1">{recommendationsError}</p>
            </div>
          </div>
        </div>
      )}

      {recommendationsLoading && !recommendations && (
        <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-12 border border-white/10 text-center">
          <RefreshCw className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg font-medium mb-2">正在从东方财富获取实时行情...</p>
          <p className="text-gray-400 text-sm">首次加载需数秒，同时获取主板/创业板/科创板/北交所四板数据</p>
        </div>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400 mt-1">推荐股票总数</p>
            </div>
            <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <p className={`text-2xl font-bold ${stats.avgChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">平均涨跌幅</p>
            </div>
            <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">3 板块</p>
              <p className="text-xs text-gray-400 mt-1">主板+创业板 / 科创板 / 北交所</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <BoardColumn
              title="主板 + 创业板"
              subtitle={BOARD_LABELS.main + ' / ' + BOARD_LABELS.chinext}
              stocks={recommendations!.mainAndChiNext}
              hasPermission={true}
              accentClass="bg-emerald-500/5"
              onClickStock={handleClickStock}
            />
            <BoardColumn
              title="科创板"
              subtitle={BOARD_LABELS.star}
              stocks={recommendations!.star}
              hasPermission={false}
              accentClass="bg-amber-500/5"
              onClickStock={handleClickStock}
            />
            <BoardColumn
              title="北交所"
              subtitle={BOARD_LABELS.bse}
              stocks={recommendations!.bse}
              hasPermission={false}
              accentClass="bg-blue-500/5"
              onClickStock={handleClickStock}
            />
          </div>

          <div className="mt-5 text-center text-xs text-gray-500">
            点击任意股票查看详细行情 →
            <span className="inline-flex items-center ml-1">
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </>
      )}
    </div>
  );
}
