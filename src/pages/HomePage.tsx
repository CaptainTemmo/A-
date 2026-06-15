import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle, ArrowRight, Lock, Unlock, TrendingUp, ChevronDown, ChevronUp, BookOpen, Target, BarChart3, Sparkles } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { Button } from '../components/ui/Button';
import type { Stock } from '../types/stock';
import { BOARD_LABELS } from '../types/stock';
import { STRATEGY_LABELS, STRATEGY_DESCRIPTIONS } from '../api/client';
import type { StrategyType } from '../api/client';

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

const VERDICT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  beat: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: '超出预期' },
  meet: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '符合预期' },
  miss: { bg: 'bg-red-500/10', text: 'text-red-400', label: '未达预期' },
  surprise: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: '意外波动' },
  unknown: { bg: 'bg-gray-500/10', text: 'text-gray-400', label: '数据缺失' },
};

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

      <div className="flex-1 overflow-y-auto max-h-[60vh]">
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

function ReviewPanel() {
  const review = useStockStore((state) => state.review);
  const reviewLoading = useStockStore((state) => state.reviewLoading);
  const reviewError = useStockStore((state) => state.reviewError);
  const refreshReview = useStockStore((state) => state.refreshReview);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!review) refreshReview();
  }, [review, refreshReview]);

  const verdictColors = (v: string) => VERDICT_COLORS[v] || VERDICT_COLORS.unknown;

  return (
    <div className="mt-6 bg-primary/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-accent" />
          <div>
            <h3 className="text-white font-semibold">上一交易日复盘</h3>
            {review && (
              <p className="text-xs text-gray-400 mt-0.5">
                复盘日期: {review.review_data?.reviewDate} · 命中率 {review.review_data?.hitRate} · 胜率 {review.review_data?.beatRate}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {review && review.review_data && (
            <div className="hidden sm:flex items-center gap-2">
              {Object.entries(review.review_data.verdicts || {}).map(([key, count]) => {
                const vc = verdictColors(key);
                return (
                  <span key={key} className={`text-xs px-2 py-0.5 rounded-full ${vc.bg} ${vc.text}`}>
                    {vc.label} {count}只
                  </span>
                );
              })}
            </div>
          )}
          {reviewLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-5">
          {reviewLoading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-gray-400 text-sm">正在加载复盘数据...</p>
            </div>
          )}

          {reviewError && !reviewLoading && (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{reviewError}</p>
              <p className="text-xs text-gray-600 mt-2">
                提示: 复盘数据需后端服务生成并部署后才会显示
              </p>
            </div>
          )}

          {review && review.review_data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{review.review_data.totalCount}</p>
                  <p className="text-xs text-gray-400 mt-1">复盘股票</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{review.review_data.hitRate}</p>
                  <p className="text-xs text-gray-400 mt-1">命中率</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{review.review_data.beatRate}</p>
                  <p className="text-xs text-gray-400 mt-1">胜率</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{review.review_data.surpriseRate}</p>
                  <p className="text-xs text-gray-400 mt-1">意外波动</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {review.review_data.items?.map((item, idx) => {
                  const vc = verdictColors(item.verdict);
                  return (
                    <div key={idx} className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium">{item.name}</span>
                            <span className="text-xs text-gray-500">{item.code}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${vc.bg} ${vc.text}`}>
                              {vc.label}
                            </span>
                            <span className="text-xs text-gray-500">推荐涨跌幅: {item.recommendedChange >= 0 ? '+' : ''}{item.recommendedChange?.toFixed(2)}%</span>
                            <span className="text-xs text-gray-500">实际涨跌幅: {item.actualChangePercent >= 0 ? '+' : ''}{item.actualChangePercent?.toFixed(2)}%</span>
                          </div>
                          <p className="text-sm text-gray-300 mt-2 leading-relaxed">{item.analysis}</p>
                          {item.relevantNews && item.relevantNews.length > 0 && (
                            <div className="mt-2 border-t border-white/5 pt-2">
                              <p className="text-xs text-gray-500 mb-1">相关新闻:</p>
                              {item.relevantNews.map((n, ni) => (
                                <p key={ni} className="text-xs text-gray-400 truncate">
                                  · {n.title} {n.time ? `(${new Date(n.time).toLocaleString('zh-CN')})` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!review && !reviewLoading && !reviewError && (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无复盘数据</p>
              <p className="text-xs text-gray-600 mt-2">收盘后自动生成并展示上一交易日推荐表现</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STRATEGIES: StrategyType[] = ['multi_factor', 'momentum', 'value', 'quality', 'growth', 'reverse', 'trend', 'fund_flow'];

export function HomePage() {
  const navigate = useNavigate();
  const recommendations = useStockStore((state) => state.recommendations);
  const recommendationsLoading = useStockStore((state) => state.recommendationsLoading);
  const recommendationsError = useStockStore((state) => state.recommendationsError);
  const refreshRecommendations = useStockStore((state) => state.refreshRecommendations);
  const currentStrategy = useStockStore((state) => state.currentStrategy);
  const setCurrentStrategy = useStockStore((state) => state.setCurrentStrategy);

  useEffect(() => {
    if (!recommendations) {
      refreshRecommendations();
    }
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
      <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-accent" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              下一交易日 · 板块选股
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            {STRATEGY_DESCRIPTIONS[currentStrategy]}
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
                <span>更新: {new Date(recommendations.lastUpdate).toLocaleString('zh-CN')}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={currentStrategy}
              onChange={(e) => setCurrentStrategy(e.target.value as StrategyType)}
              className="appearance-none bg-primary/60 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm font-medium pr-10 cursor-pointer hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {STRATEGIES.map((strategy) => (
                <option key={strategy} value={strategy} className="bg-primary text-white">
                  {STRATEGY_LABELS[strategy]}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
      </div>

      <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            <span className="text-white font-medium">当前策略:</span>
            <span className="text-accent font-semibold">{STRATEGY_LABELS[currentStrategy]}</span>
          </div>
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.slice(0, 5).map((strategy) => (
              <button
                key={strategy}
                onClick={() => setCurrentStrategy(strategy)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  currentStrategy === strategy
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {STRATEGY_LABELS[strategy]}
              </button>
            ))}
          </div>
        </div>
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
          <p className="text-gray-400 text-sm">同时获取主板/创业板/科创板/北交所四板数据</p>
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
              <p className="text-xs text-gray-400 mt-1">推荐池平均涨跌幅</p>
            </div>
            <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                3 板块
              </p>
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

          <ReviewPanel />

          <div className="mt-5 text-center text-xs text-gray-500">
            点击任意股票查看详细行情 → <ArrowRight className="w-3 h-3 inline" />
          </div>
        </>
      )}
    </div>
  );
}
