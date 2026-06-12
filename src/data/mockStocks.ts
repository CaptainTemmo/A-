import { Stock, StockFilterCriteria, Strategy } from '../types/stock';

export const CHINA_STOCK_NAMES = [
  '平安银行', '万科A', '华侨城A', '盐田港', '深圳能源', '国药一致', '国信证券', '招商证券',
  '宏源证券', '农产品', '华联控股', '深振业A', '深深宝A', '深物业A', '南方航空', '沙河股份',
  '深康佳A', '深赤湾A', '科陆电子', '许继电气', '张江高科', '上海机场', '浦发银行', '邯郸钢铁',
  '齐鲁石化', '青岛啤酒', '上海汽车', '国电电力', '华能国际', '皖通高速', '中原高速', '福建高速',
  '楚天高速', '江西铜业', '金铜集团', '中金岭南', '格力电器', '美的电器', '海王生物', '粤电力A',
  '韶钢松山', '柳钢股份', '新钢股份', '华菱钢铁', '安凯客车', '江铃汽车', '一汽轿车', '亚星客车',
  '北京银行', '华夏银行', '民生银行', '首创股份', '上海建工', '复星医药', '金蝶软件', '用友软件',
  '中信证券', '海通证券', '中国平安', '中国人寿', '中国太保', '中国银行'
];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateCode(index: number): string {
  return `60${String(index + 1000).padStart(4, '0')}`;
}

export function generateMockStocks(): Stock[] {
  return CHINA_STOCK_NAMES.map((name, index) => {
    const price = randomInRange(5, 150);
    const changePercent = randomInRange(-10, 10);
    const rsi = randomInRange(20, 80);
    const volume = Math.floor(randomInRange(1000000, 50000000));
    const turnover = volume * price;
    const marketCap = randomInRange(10, 500) * 1e8;

    const dif = randomInRange(-2, 2);
    const dea = randomInRange(-1.5, 1.5);
    const histogram = dif - dea;

    const k = randomInRange(20, 80);
    const d = randomInRange(20, 80);
    const j = randomInRange(10, 90);

    const bollMiddle = price;
    const bollUpper = price * randomInRange(1.01, 1.05);
    const bollLower = price * randomInRange(0.95, 0.99);

    const selectionReasons: string[] = [];
    if (rsi < 30) selectionReasons.push('RSI超卖');
    if (rsi > 70) selectionReasons.push('RSI超买');
    if (histogram > 0) selectionReasons.push('MACD柱状图正向');
    if (volume > 10000000) selectionReasons.push('成交量放大');
    if (changePercent > 5) selectionReasons.push('涨幅较大');

    return {
      code: generateCode(index),
      name,
      price: Math.round(price * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      turnover,
      turnoverRate: Math.round(randomInRange(0.5, 15) * 100) / 100,
      volumeRatio: Math.round(randomInRange(0.5, 5) * 100) / 100,
      marketCap: Math.round(marketCap),
      pe: Math.round(randomInRange(5, 50) * 100) / 100,
      rsi: Math.round(rsi * 100) / 100,
      macd: {
        dif: Math.round(dif * 100) / 100,
        dea: Math.round(dea * 100) / 100,
        histogram: Math.round(histogram * 100) / 100
      },
      kdj: {
        k: Math.round(k * 100) / 100,
        d: Math.round(d * 100) / 100,
        j: Math.round(j * 100) / 100
      },
      boll: {
        upper: Math.round(bollUpper * 100) / 100,
        middle: Math.round(bollMiddle * 100) / 100,
        lower: Math.round(bollLower * 100) / 100
      },
      mainNetFlow: Math.round(randomInRange(-500, 2000) * 10000) / 10000,
      fiveDayNetFlow: Math.round(randomInRange(-1000, 3000) * 10000) / 10000,
      tenDayNetFlow: Math.round(randomInRange(-2000, 5000) * 10000) / 10000,
      selectionReasons
    };
  });
}

export const PRESET_STRATEGIES: Strategy[] = [
  {
    id: 'conservative',
    name: '保守策略',
    type: 'conservative',
    criteria: {
      rsiRange: [30, 70],
      macdSignal: 'neutral',
      volumeRatioMin: 1.0,
      mainNetFlowMin: 0,
      consecutiveDaysMin: 3,
      marketCapRange: [50, 500],
      peRange: [10, 30],
      priceRange: [10, 100],
      changePercentRange: [-5, 5]
    }
  },
  {
    id: 'aggressive',
    name: '激进策略',
    type: 'aggressive',
    criteria: {
      rsiRange: [40, 85],
      macdSignal: 'golden_cross',
      volumeRatioMin: 1.5,
      mainNetFlowMin: 500,
      consecutiveDaysMin: 2,
      marketCapRange: [10, 200],
      peRange: [5, 50],
      priceRange: [5, 80],
      changePercentRange: [0, 10]
    }
  },
  {
    id: 'value',
    name: '价值投资',
    type: 'value',
    criteria: {
      rsiRange: [20, 60],
      macdSignal: 'neutral',
      volumeRatioMin: 0.5,
      mainNetFlowMin: -200,
      consecutiveDaysMin: 5,
      marketCapRange: [100, 1000],
      peRange: [5, 20],
      priceRange: [5, 150],
      changePercentRange: [-10, 5]
    }
  }
];

export function filterStocks(stocks: Stock[], criteria: StockFilterCriteria): Stock[] {
  return stocks.filter(stock => {
    if (stock.rsi < criteria.rsiRange[0] || stock.rsi > criteria.rsiRange[1]) return false;

    if (criteria.macdSignal === 'golden_cross' && !(stock.macd.dif > stock.macd.dea && stock.macd.histogram > 0)) return false;
    if (criteria.macdSignal === 'death_cross' && !(stock.macd.dif < stock.macd.dea && stock.macd.histogram < 0)) return false;

    if (stock.volumeRatio < criteria.volumeRatioMin) return false;
    if (stock.mainNetFlow < criteria.mainNetFlowMin) return false;
    if (stock.marketCap < criteria.marketCapRange[0] || stock.marketCap > criteria.marketCapRange[1]) return false;
    if (stock.pe < criteria.peRange[0] || stock.pe > criteria.peRange[1]) return false;
    if (stock.price < criteria.priceRange[0] || stock.price > criteria.priceRange[1]) return false;
    if (stock.changePercent < criteria.changePercentRange[0] || stock.changePercent > criteria.changePercentRange[1]) return false;

    return true;
  });
}

export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export function generateKLineData(stock: Stock, days: number = 30): KLineData[] {
  const data: KLineData[] = [];
  let currentPrice = stock.price * randomInRange(0.9, 1.1);

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const open = currentPrice;
    const change = randomInRange(-0.05, 0.05);
    const close = open * (1 + change);
    const high = Math.max(open, close) * randomInRange(1, 1.03);
    const low = Math.min(open, close) * randomInRange(0.97, 1);
    const volume = Math.floor(randomInRange(1000000, 10000000));

    data.push({
      date: dateStr,
      open: Math.round(open * 100) / 100,
      close: Math.round(close * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      volume
    });

    currentPrice = close;
  }

  return data;
}

export interface FundFlowData {
  date: string;
  mainFlow: number;
  fiveDayFlow: number;
  tenDayFlow: number;
}

export function generateFundFlowData(days: number = 30): FundFlowData[] {
  const data: FundFlowData[] = [];
  let mainFlow = randomInRange(-500, 1000);
  let fiveDayFlow = randomInRange(-1000, 2000);
  let tenDayFlow = randomInRange(-2000, 3000);

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    mainFlow = mainFlow + randomInRange(-200, 200);
    fiveDayFlow = fiveDayFlow + randomInRange(-300, 300);
    tenDayFlow = tenDayFlow + randomInRange(-500, 500);

    data.push({
      date: dateStr,
      mainFlow: Math.round(mainFlow * 100) / 100,
      fiveDayFlow: Math.round(fiveDayFlow * 100) / 100,
      tenDayFlow: Math.round(tenDayFlow * 100) / 100
    });
  }

  return data;
}
