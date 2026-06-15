/**
 * 按板块获取候选股票 (clist/get)
 * 自动获取该板块全部股票，从中筛选评分最高的候选
 */
async function fetchBoardCandidates(boardId, boardName) {
  const fields = 'f2,f3,f4,f5,f6,f8,f10,f12,f14,f15,f16,f17,f18,f20,f57,f58,f60,f62,f100,f104,f105,f116,f117,f128,f140,f141,f162,f167,f168';
  const pageSize = 100; // 单页最大有效条数

  const allRaw = [];
  let pageCount = 1;
  let currentPage = 1;

  console.log(`[eastmoney] 开始获取 ${boardName} 全部股票...`);

  // 循环获取所有页
  while (currentPage <= pageCount) {
    const url = `${BASE_URL}/api/qt/clist/get?pn=${currentPage}&pz=${pageSize}&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(boardId)}&fields=${encodeURIComponent(fields)}`;
    try {
      const data = await emFetch(url, 20000);
      if (data?.data?.diff && Array.isArray(data.data.diff)) {
        allRaw.push(...data.data.diff);
        
        // 第一页时获取总条数，确定需要请求多少页
        if (currentPage === 1 && data.data.total) {
          pageCount = Math.ceil(data.data.total / pageSize);
          console.log(`[eastmoney] ${boardName} 共 ${data.data.total} 只股票，需要请求 ${pageCount} 页`);
        }
      }
    } catch (err) {
      console.warn(`[eastmoney] ${boardName} 分页 ${currentPage} 获取失败:`, err.message);
      break; // 遇到错误就停止
    }

    currentPage++;
    
    // 每页间隔 150ms 避免过快请求
    if (currentPage <= pageCount) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  // 去重（避免分页重复）
  const seen = new Set();
  const uniqueRaw = allRaw.filter(q => {
    const code = String(q.f12 ?? '');
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });

  console.log(`[eastmoney] ${boardName} 去重后 ${uniqueRaw.length} 只候选`);

  const stocks = [];
  for (const q of uniqueRaw) {
    const code = String(q.f12 ?? '');
    const name = String(q.f14 ?? '');
    const price = parseFloat(q.f2) || 0;
    const preClose = parseFloat(q.f18) || 0;

    if (!code || price <= 0) continue;

    const changePercent = parseFloat(q.f3) || 0;
    if (changePercent >= 9.9 || changePercent <= -9.9) continue;

    const volume = parseFloat(q.f5) || 0;
    const turnover = parseFloat(q.f6) || 0;
    const turnoverRate = parseFloat(q.f8) || 0;
    const volumeRatio = parseFloat(q.f10) || 1;
    const marketCap = parseFloat(q.f20) || 0;
    const pe = parseFloat(q.f9) || 0;

    let penalty = 0;
    if (changePercent > 7) penalty = (changePercent - 7) * 1.5;
    if (changePercent < -3) penalty = Math.abs(changePercent + 3) * 2;
    const score = changePercent * 2 + volumeRatio * 1.5 + turnoverRate * 0.5 - penalty;

    const reasons = [];
    if (changePercent > 3) reasons.push('涨幅较大');
    if (changePercent > 0) reasons.push('上涨');
    if (changePercent < 0) reasons.push('下跌');
    if (volumeRatio > 2) reasons.push('量比放大');
    if (turnoverRate > 5) reasons.push('换手活跃');
    if (volume > 50000000) reasons.push('成交量大');

    stocks.push({
      code,
      name,
      board: boardName,
      price,
      changePercent,
      changeAmount: parseFloat(q.f4) || 0,
      volume,
      turnover,
      turnoverRate,
      volumeRatio,
      marketCap,
      pe,
      rsi: 50,
      macd: { dif: 0, dea: 0, histogram: 0 },
      kdj: { k: 50, d: 50, j: 50 },
      boll: { upper: price * 1.03, middle: price, lower: price * 0.97 },
      mainNetFlow: (parseFloat(q.f4) || 0) * volume / 10000,
      fiveDayNetFlow: 0,
      tenDayNetFlow: 0,
      selectionReasons: reasons,
      lastUpdate: Date.now(),
      score,
    });
  }

  console.log(`[eastmoney] ${boardName} 过滤后 ${stocks.length} 只有效候选`);
  return stocks;
}