import type { Stock } from '../../types/stock';
import { Badge } from '../common/Badge';

interface IndicatorPanelProps {
  stock: Stock;
}

export function IndicatorPanel({ stock }: IndicatorPanelProps) {
  const { rsi, macd, kdj, boll } = stock;

  const getRSIStatus = (rsi: number): { label: string; variant: 'success' | 'danger' | 'warning' | 'info' } => {
    if (rsi < 30) return { label: '超卖', variant: 'success' };
    if (rsi > 70) return { label: '超买', variant: 'danger' };
    if (rsi < 40) return { label: '偏弱', variant: 'warning' };
    if (rsi > 60) return { label: '偏强', variant: 'info' };
    return { label: '中性', variant: 'info' };
  };

  const getMACDStatus = (histogram: number): { label: string; variant: 'success' | 'danger' | 'info' } => {
    if (histogram > 0) return { label: '多头', variant: 'success' };
    if (histogram < 0) return { label: '空头', variant: 'danger' };
    return { label: '中性', variant: 'info' };
  };

  const getKDJStatus = (k: number, d: number): { label: string; variant: 'success' | 'danger' | 'info' } => {
    if (k > 80 && d > 80) return { label: '超买', variant: 'danger' };
    if (k < 20 && d < 20) return { label: '超卖', variant: 'success' };
    if (k > d) return { label: '金叉', variant: 'success' };
    if (k < d) return { label: '死叉', variant: 'danger' };
    return { label: '中性', variant: 'info' };
  };

  const rsiStatus = getRSIStatus(rsi);
  const macdStatus = getMACDStatus(macd.histogram);
  const kdjStatus = getKDJStatus(kdj.k, kdj.d);

  return (
    <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">技术指标</h3>
      
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">RSI</span>
              <Badge variant={rsiStatus.variant} size="sm">{rsiStatus.label}</Badge>
            </div>
            <span className="text-xl font-bold text-white">{rsi.toFixed(1)}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">MACD</span>
              <Badge variant={macdStatus.variant} size="sm">{macdStatus.label}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">DIF</p>
              <p className={`text-lg font-semibold ${macd.dif >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {macd.dif.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">DEA</p>
              <p className={`text-lg font-semibold ${macd.dea >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {macd.dea.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">柱状图</p>
              <p className={`text-lg font-semibold ${macd.histogram >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {macd.histogram.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">KDJ</span>
              <Badge variant={kdjStatus.variant} size="sm">{kdjStatus.label}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">K</p>
              <p className="text-lg font-semibold text-white">{kdj.k.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">D</p>
              <p className="text-lg font-semibold text-white">{kdj.d.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">J</p>
              <p className={`text-lg font-semibold ${kdj.j > 80 ? 'text-red-400' : kdj.j < 20 ? 'text-green-400' : 'text-white'}`}>
                {kdj.j.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">布林带 (BOLL)</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">上轨</span>
              <span className="text-sm font-medium text-red-400">{boll.upper.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">中轨</span>
              <span className="text-sm font-medium text-yellow-400">{boll.middle.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">下轨</span>
              <span className="text-sm font-medium text-green-400">{boll.lower.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
