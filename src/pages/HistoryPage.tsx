import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, getChangePercentVariant, formatPercent } from '../components/common/Badge';
import { generateMockStocks } from '../data/mockStocks';

interface HistoryEntry {
  date: string;
  stocks: ReturnType<typeof generateMockStocks>;
}

export function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [history] = useState<HistoryEntry[]>(() => {
    const entries: HistoryEntry[] = [];
    const baseStocks = generateMockStocks();
    
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      entries.push({
        date: dateStr,
        stocks: baseStocks.map(stock => ({
          ...stock,
          price: stock.price * (1 + (Math.random() - 0.5) * 0.1),
          changePercent: stock.changePercent * (1 + (Math.random() - 0.5) * 0.2),
        })),
      });
    }
    
    return entries;
  });

  const availableDates = useMemo(() => {
    return history.map(entry => entry.date).sort((a, b) => b.localeCompare(a));
  }, [history]);

  const selectedHistory = useMemo(() => {
    return history.find(entry => entry.date === selectedDate) || history[0];
  }, [history, selectedDate]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    }

    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleDateString('zh-CN', { weekday: 'short' })}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(2)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(2)}万`;
    }
    return num.toLocaleString();
  };

  const goToPreviousDay = () => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    }
  };

  const goToNextDay = () => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  };

  const isNextDisabled = availableDates.indexOf(selectedDate) === 0;
  const isPrevDisabled = availableDates.indexOf(selectedDate) === availableDates.length - 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">历史记录</h1>
        <p className="text-gray-400">查看过往选股结果</p>
      </div>

      {/* Date Selector */}
      <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousDay}
            disabled={isPrevDisabled}
            className={`p-2 rounded-lg transition-colors ${
              isPrevDisabled 
                ? 'text-gray-600 cursor-not-allowed' 
                : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-accent" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-lg font-medium focus:outline-none cursor-pointer"
            >
              {availableDates.map((date) => (
                <option key={date} value={date} className="bg-primary text-white">
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={goToNextDay}
            disabled={isNextDisabled}
            className={`p-2 rounded-lg transition-colors ${
              isNextDisabled 
                ? 'text-gray-600 cursor-not-allowed' 
                : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>选中日期: {new Date(selectedDate).toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}</span>
        </div>
      </div>

      {/* Date Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {availableDates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${date === selectedDate 
                ? 'bg-accent/20 text-accent border border-accent/50' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }
            `}
          >
            {formatDate(date)}
          </button>
        ))}
      </div>

      {/* Stock List */}
      <div className="bg-primary/60 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {formatDate(selectedDate)} 选股结果
            <span className="text-gray-400 font-normal ml-2">
              ({selectedHistory?.stocks.length || 0} 只)
            </span>
          </h2>
        </div>

        {selectedHistory && selectedHistory.stocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    股票
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    价格
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    涨跌幅
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    换手率
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    量比
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    RSI
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    主力净流入
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selectedHistory.stocks.map((stock) => (
                  <tr key={stock.code} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/stock/${stock.code}`} className="block group">
                        <p className="text-white font-medium group-hover:text-accent transition-colors">
                          {stock.name}
                        </p>
                        <p className="text-sm text-gray-500">{stock.code}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white font-medium">¥{stock.price.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={getChangePercentVariant(stock.changePercent)} size="md">
                        {formatPercent(stock.changePercent)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{stock.turnoverRate.toFixed(2)}%</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{stock.volumeRatio.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-white">{stock.rsi.toFixed(1)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`font-medium ${stock.mainNetFlow >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {stock.mainNetFlow >= 0 ? '+' : ''}{formatNumber(stock.mainNetFlow)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to={`/stock/${stock.code}`}
                        className="px-3 py-1.5 text-sm bg-accent/20 text-accent hover:bg-accent/30 rounded-md transition-colors"
                      >
                        详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-400">该日期暂无选股记录</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedHistory && selectedHistory.stocks.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-sm text-gray-400 mb-1">上涨股票</p>
            <p className="text-2xl font-bold text-red-400">
              {selectedHistory.stocks.filter(s => s.changePercent > 0).length} 只
            </p>
          </div>
          <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-sm text-gray-400 mb-1">下跌股票</p>
            <p className="text-2xl font-bold text-green-400">
              {selectedHistory.stocks.filter(s => s.changePercent < 0).length} 只
            </p>
          </div>
          <div className="bg-primary/60 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-sm text-gray-400 mb-1">平均涨幅</p>
            <p className={`text-2xl font-bold ${
              (selectedHistory.stocks.reduce((sum, s) => sum + s.changePercent, 0) / selectedHistory.stocks.length) >= 0 
                ? 'text-red-400' 
                : 'text-green-400'
            }`}>
              {(
                selectedHistory.stocks.reduce((sum, s) => sum + s.changePercent, 0) / 
                selectedHistory.stocks.length
              ).toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
