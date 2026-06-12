import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
}

export function StatCard({ title, value, icon: Icon, trend, suffix }: StatCardProps) {
  const TrendIcon = trend
    ? trend.isPositive
      ? TrendingUp
      : TrendingDown
    : Minus;

  const trendColorClass = trend
    ? trend.isPositive
      ? 'text-red-500'
      : 'text-green-500'
    : 'text-gray-500';

  return (
    <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-accent/10">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColorClass}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">
        {value}
        {suffix && <span className="text-lg text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
