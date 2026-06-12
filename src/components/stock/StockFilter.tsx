import React, { useState, useEffect } from 'react';
import { useStockStore } from '../../store/stockStore';
import type { StockFilterCriteria } from '../../types/stock';

export const StockFilter: React.FC = () => {
  const filterCriteria = useStockStore((s) => s.filterCriteria);
  const setFilterCriteria = useStockStore((s) => s.setFilterCriteria);
  const resetFilter = useStockStore((s) => s.resetFilter);
  const strategies = useStockStore((s) => s.strategies);
  const applyStrategy = useStockStore((s) => s.applyStrategy);

  const [localCriteria, setLocalCriteria] = useState<StockFilterCriteria>(filterCriteria);

  useEffect(() => {
    setLocalCriteria(filterCriteria);
  }, [filterCriteria]);

  const handleApply = () => {
    setFilterCriteria(localCriteria);
  };

  const handleReset = () => {
    resetFilter();
    setLocalCriteria({
      rsiRange: [0, 100],
      macdSignal: 'neutral',
      volumeRatioMin: 0,
      mainNetFlowMin: 0,
      consecutiveDaysMin: 0,
      marketCapRange: [0, Infinity],
      peRange: [0, Infinity],
      priceRange: [0, Infinity],
      changePercentRange: [-100, 100],
    });
  };

  const handleStrategyClick = (strategy: (typeof strategies)[0]) => {
    applyStrategy(strategy);
    setLocalCriteria(strategy.criteria);
  };

  const updateRange = (
    field: keyof StockFilterCriteria,
    index: 0 | 1,
    value: number
  ) => {
    const current = localCriteria[field] as [number, number];
    const newRange: [number, number] = [...current];
    newRange[index] = value;
    setLocalCriteria({ ...localCriteria, [field]: newRange });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-400 self-center">策略:</span>
        {strategies.map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => handleStrategyClick(strategy)}
            className={`
              px-3 py-1.5 text-sm rounded-md border transition-colors
              ${
                filterCriteria === strategy.criteria
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:border-gray-600'
              }
            `}
          >
            {strategy.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">涨跌幅范围 (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={localCriteria.changePercentRange[0]}
              onChange={(e) => updateRange('changePercentRange', 0, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最小值"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={localCriteria.changePercentRange[1]}
              onChange={(e) => updateRange('changePercentRange', 1, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最大值"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">RSI 范围</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={localCriteria.rsiRange[0]}
              onChange={(e) => updateRange('rsiRange', 0, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最小值"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={localCriteria.rsiRange[1]}
              onChange={(e) => updateRange('rsiRange', 1, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最大值"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">量比最小值</label>
          <input
            type="number"
            value={localCriteria.volumeRatioMin}
            onChange={(e) =>
              setLocalCriteria({
                ...localCriteria,
                volumeRatioMin: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
            step="0.1"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">主力净流入最小值 (元)</label>
          <input
            type="number"
            value={localCriteria.mainNetFlowMin}
            onChange={(e) =>
              setLocalCriteria({
                ...localCriteria,
                mainNetFlowMin: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
            step="1000000"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">市值范围 (元)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={localCriteria.marketCapRange[0]}
              onChange={(e) => updateRange('marketCapRange', 0, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最小值"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={localCriteria.marketCapRange[1] === Infinity ? '' : localCriteria.marketCapRange[1]}
              onChange={(e) =>
                updateRange(
                  'marketCapRange',
                  1,
                  e.target.value === '' ? Infinity : parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最大值"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">市盈率 (PE) 范围</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={localCriteria.peRange[0]}
              onChange={(e) => updateRange('peRange', 0, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最小值"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={localCriteria.peRange[1] === Infinity ? '' : localCriteria.peRange[1]}
              onChange={(e) =>
                updateRange(
                  'peRange',
                  1,
                  e.target.value === '' ? Infinity : parseFloat(e.target.value) || 0
                )
              }
              className="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded text-white text-sm"
              placeholder="最大值"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleReset}
          className="px-4 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-md hover:border-gray-600 transition-colors"
        >
          重置
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 text-sm text-white bg-blue-500/20 border border-blue-500/50 rounded-md hover:bg-blue-500/30 transition-colors"
        >
          应用
        </button>
      </div>
    </div>
  );
};