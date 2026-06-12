import { useState } from 'react';
import { Shield, Zap, DollarSign, Check, Sliders } from 'lucide-react';
import { useStockStore } from '../store/stockStore';
import { Button } from '../components/ui/Button';
import type { Strategy } from '../types/stock';

const strategyIcons = {
  conservative: Shield,
  aggressive: Zap,
  value: DollarSign,
};

const strategyColors = {
  conservative: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  aggressive: 'from-red-500/20 to-red-600/10 border-red-500/30',
  value: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
};

export function StrategyPage() {
  const strategies = useStockStore((s) => s.strategies);
  const filterCriteria = useStockStore((s) => s.filterCriteria);
  const setFilterCriteria = useStockStore((s) => s.setFilterCriteria);
  const applyStrategy = useStockStore((s) => s.applyStrategy);
  const resetFilter = useStockStore((s) => s.resetFilter);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const handleStrategySelect = (strategy: Strategy) => {
    setSelectedStrategy(strategy.id);
    applyStrategy(strategy);
  };

  const handleRSIChange = (index: number, value: number) => {
    const newRange: [number, number] = [...filterCriteria.rsiRange] as [number, number];
    newRange[index] = value;
    setFilterCriteria({ rsiRange: newRange });
  };

  const handleRangeChange = (key: keyof typeof filterCriteria, value: number | [number, number]) => {
    setFilterCriteria({ [key]: value });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">选股策略</h1>
        <p className="text-gray-400">选择预设策略或自定义筛选条件</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Strategy Presets */}
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">策略预设</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategies.map((strategy) => {
                const Icon = strategyIcons[strategy.type];
                const isSelected = selectedStrategy === strategy.id;
                return (
                  <button
                    key={strategy.id}
                    onClick={() => handleStrategySelect(strategy)}
                    className={`
                      relative p-4 rounded-xl border transition-all text-left
                      bg-gradient-to-br ${strategyColors[strategy.type]}
                      ${isSelected ? 'ring-2 ring-accent' : 'hover:scale-[1.02]'}
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <Icon className="w-8 h-8 text-white mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-1">{strategy.name}</h3>
                    <p className="text-sm text-gray-400">
                      {strategy.type === 'conservative' && '低风险，稳定收益'}
                      {strategy.type === 'aggressive' && '高风险，追求高回报'}
                      {strategy.type === 'value' && '价值投资，长期持有'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Range Sliders */}
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">自定义筛选</h2>
              <Button variant="ghost" size="sm" onClick={resetFilter}>
                重置
              </Button>
            </div>

            <div className="space-y-6">
              {/* RSI Range */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">RSI 区间</label>
                  <span className="text-sm text-accent">
                    {filterCriteria.rsiRange[0]} - {filterCriteria.rsiRange[1]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterCriteria.rsiRange[0]}
                    onChange={(e) => handleRSIChange(0, Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterCriteria.rsiRange[1]}
                    onChange={(e) => handleRSIChange(1, Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>

              {/* Volume Ratio Min */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">最小量比</label>
                  <span className="text-sm text-accent">{filterCriteria.volumeRatioMin.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={filterCriteria.volumeRatioMin}
                  onChange={(e) => handleRangeChange('volumeRatioMin', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              {/* Main Net Flow Min */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">最小主力净流入 (万)</label>
                  <span className="text-sm text-accent">
                    {(filterCriteria.mainNetFlowMin / 10000).toFixed(0)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="10"
                  value={filterCriteria.mainNetFlowMin}
                  onChange={(e) => handleRangeChange('mainNetFlowMin', Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              {/* Change Percent Range */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">涨跌幅区间 (%)</label>
                  <span className="text-sm text-accent">
                    {filterCriteria.changePercentRange[0]}% - {filterCriteria.changePercentRange[1]}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={filterCriteria.changePercentRange[0]}
                    onChange={(e) => handleRangeChange('changePercentRange', [Number(e.target.value), filterCriteria.changePercentRange[1]])}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={filterCriteria.changePercentRange[1]}
                    onChange={(e) => handleRangeChange('changePercentRange', [filterCriteria.changePercentRange[0], Number(e.target.value)])}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>

              {/* PE Range */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">市盈率 (PE) 区间</label>
                  <span className="text-sm text-accent">
                    {filterCriteria.peRange[0]} - {filterCriteria.peRange[1]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterCriteria.peRange[0]}
                    onChange={(e) => handleRangeChange('peRange', [Number(e.target.value), filterCriteria.peRange[1]])}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterCriteria.peRange[1]}
                    onChange={(e) => handleRangeChange('peRange', [filterCriteria.peRange[0], Number(e.target.value)])}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">价格区间 (元)</label>
                  <span className="text-sm text-accent">
                    {filterCriteria.priceRange[0]} - {filterCriteria.priceRange[1] === Infinity ? '∞' : filterCriteria.priceRange[1]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filterCriteria.priceRange[0]}
                    onChange={(e) => handleRangeChange('priceRange', [Number(e.target.value), filterCriteria.priceRange[1]])}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={filterCriteria.priceRange[1]}
                    onChange={(e) => handleRangeChange('priceRange', [filterCriteria.priceRange[0], Number(e.target.value)])}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Strategy Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-white">当前策略</h2>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">RSI 区间</p>
                <p className="text-white font-medium">
                  {filterCriteria.rsiRange[0]} - {filterCriteria.rsiRange[1]}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">最小量比</p>
                <p className="text-white font-medium">{filterCriteria.volumeRatioMin.toFixed(1)}</p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">最小主力净流入</p>
                <p className="text-white font-medium">
                  {(filterCriteria.mainNetFlowMin / 100000000).toFixed(2)}亿
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">涨跌幅区间</p>
                <p className="text-white font-medium">
                  {filterCriteria.changePercentRange[0]}% ~ {filterCriteria.changePercentRange[1]}%
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">市盈率 (PE)</p>
                <p className="text-white font-medium">
                  {filterCriteria.peRange[0]} - {filterCriteria.peRange[1]}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">价格区间</p>
                <p className="text-white font-medium">
                  ¥{filterCriteria.priceRange[0]} - ¥{filterCriteria.priceRange[1] === Infinity ? '∞' : filterCriteria.priceRange[1]}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400 mb-1">MACD 信号</p>
                <p className="text-white font-medium capitalize">
                  {filterCriteria.macdSignal === 'neutral' ? '中性' : 
                   filterCriteria.macdSignal === 'golden_cross' ? '金叉' : '死叉'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
