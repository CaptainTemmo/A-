export interface StockMeta {
  code: string;
  name: string;
}

export const DEFAULT_STOCK_POOL: StockMeta[] = [
  { code: '600519', name: '贵州茅台' },
  { code: '601398', name: '工商银行' },
  { code: '601288', name: '农业银行' },
  { code: '601988', name: '中国银行' },
  { code: '600036', name: '招商银行' },
  { code: '000858', name: '五粮液' },
  { code: '000001', name: '平安银行' },
  { code: '600030', name: '中信证券' },
  { code: '600000', name: '浦发银行' },
  { code: '000002', name: '万科A' },
  { code: '601318', name: '中国平安' },
  { code: '600887', name: '伊利股份' },
  { code: '600276', name: '恒瑞医药' },
  { code: '000333', name: '美的集团' },
  { code: '600900', name: '长江电力' },
  { code: '601888', name: '中国中免' },
  { code: '601012', name: '隆基绿能' },
  { code: '002594', name: '比亚迪' },
  { code: '300750', name: '宁德时代' },
  { code: '600031', name: '三一重工' },
  { code: '601166', name: '兴业银行' },
  { code: '600048', name: '保利发展' },
  { code: '000651', name: '格力电器' },
  { code: '000725', name: '京东方A' },
  { code: '600585', name: '海螺水泥' },
  { code: '601688', name: '华泰证券' },
  { code: '000725', name: '京东方A' },
  { code: '600309', name: '万华化学' },
  { code: '601919', name: '中远海控' },
  { code: '002415', name: '海康威视' },
  { code: '600028', name: '中国石化' },
  { code: '601857', name: '中国石油' },
  { code: '601668', name: '中国建筑' },
  { code: '600050', name: '中国联通' },
  { code: '600104', name: '上汽集团' },
  { code: '000100', name: 'TCL科技' },
  { code: '002475', name: '立讯精密' },
  { code: '601899', name: '紫金矿业' },
  { code: '002304', name: '洋河股份' },
  { code: '600031', name: '三一重工' },
  { code: '600196', name: '复星医药' },
  { code: '002452', name: '沃森生物' },
  { code: '300059', name: '东方财富' },
  { code: '000651', name: '格力电器' },
  { code: '002415', name: '海康威视' },
  { code: '600585', name: '海螺水泥' },
  { code: '600703', name: '三安光电' },
  { code: '000768', name: '中航西飞' },
  { code: '600372', name: '中航电子' },
  { code: '000063', name: '中兴通讯' },
  { code: '600837', name: '海通证券' },
  { code: '601166', name: '兴业银行' },
  { code: '600690', name: '海尔智家' },
  { code: '600519', name: '贵州茅台' },
  { code: '000568', name: '泸州老窖' },
  { code: '600745', name: '闻泰科技' },
  { code: '603288', name: '海天味业' },
  { code: '601088', name: '中国神华' },
  { code: '600770', name: '华侨城A' },
  { code: '000963', name: '华东医药' },
  { code: '002460', name: '赣锋锂业' },
  { code: '600565', name: '中国宝安' },
];

export function getStockPool(): StockMeta[] {
  const seen = new Set<string>();
  const unique: StockMeta[] = [];
  for (const s of DEFAULT_STOCK_POOL) {
    if (!seen.has(s.code)) {
      seen.add(s.code);
      unique.push(s);
    }
  }
  return unique;
}
