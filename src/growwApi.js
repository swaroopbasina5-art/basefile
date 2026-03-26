const axios = require('axios');

const BASE_URL = process.env.GROWW_BASE_URL || 'https://groww.in/v1/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
  },
});

/**
 * Fetch live stock quote from Groww
 */
async function getStockQuote(symbol) {
  try {
    const searchRes = await client.get(`/search/v1/derived/scheme`, {
      params: { q: symbol, size: 1, doc_type: 'stock' },
    });

    const stock = searchRes.data?.content?.[0];
    if (!stock) throw new Error(`Stock not found: ${symbol}`);

    const bseScriptCode = stock.bse_script_code;
    const nseScriptCode = stock.nse_script_code || symbol;
    const growwContractId = stock.groww_contract_id;

    const liveRes = await client.get(
      `/stocks_data/v1/accord_points/exchange/NSE/segment/CASH/latest_prices_ohlc/${nseScriptCode}`
    );

    const liveData = liveRes.data;

    return {
      symbol,
      name: stock.company_name || symbol,
      currentPrice: liveData.ltp || liveData.close,
      open: liveData.open,
      high: liveData.high,
      low: liveData.low,
      close: liveData.close,
      previousClose: liveData.prev_close,
      change: liveData.day_change,
      changePercent: liveData.day_change_perc,
      volume: liveData.volume,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback: try direct NSE-style endpoint
    return getStockQuoteFallback(symbol);
  }
}

/**
 * Fallback quote fetcher using Groww stocks data API
 */
async function getStockQuoteFallback(symbol) {
  try {
    const res = await client.get(
      `/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${symbol}`
    );
    const data = res.data;

    return {
      symbol,
      name: symbol,
      currentPrice: data.ltp || data.close || 0,
      open: data.open || 0,
      high: data.high || 0,
      low: data.low || 0,
      close: data.close || 0,
      previousClose: data.prev_close || 0,
      change: data.ltp && data.prev_close ? data.ltp - data.prev_close : 0,
      changePercent:
        data.ltp && data.prev_close
          ? ((data.ltp - data.prev_close) / data.prev_close) * 100
          : 0,
      volume: data.volume || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Failed to fetch quote for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Fetch historical OHLC data for technical analysis
 */
async function getHistoricalData(symbol, days = 60) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const res = await client.get(
      `/charting_service/v2/chart/exchange/NSE/segment/CASH/${symbol}`,
      {
        params: {
          endTimeInMillis: endDate.getTime(),
          startTimeInMillis: startDate.getTime(),
          intervalInMinutes: 1440, // daily candles
        },
      }
    );

    const candles = res.data?.candles || [];
    return candles.map((c) => ({
      date: new Date(c[0]),
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));
  } catch (err) {
    console.error(`Failed to fetch historical data for ${symbol}:`, err.message);
    return [];
  }
}

/**
 * Fetch multiple stock quotes in parallel
 */
async function getMultipleQuotes(symbols) {
  const results = await Promise.allSettled(
    symbols.map((s) => getStockQuote(s))
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
}

module.exports = {
  getStockQuote,
  getHistoricalData,
  getMultipleQuotes,
};
