const { RSI, SMA, EMA, MACD, BollingerBands } = require('technicalindicators');

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(closePrices, period = 14) {
  const result = RSI.calculate({ values: closePrices, period });
  return result.length > 0 ? result[result.length - 1] : null;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
function calculateSMA(closePrices, period) {
  const result = SMA.calculate({ values: closePrices, period });
  return result.length > 0 ? result[result.length - 1] : null;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(closePrices, period) {
  const result = EMA.calculate({ values: closePrices, period });
  return result.length > 0 ? result[result.length - 1] : null;
}

/**
 * Detect SMA crossover (golden cross / death cross)
 */
function detectSMACrossover(closePrices, shortPeriod = 20, longPeriod = 50) {
  const shortSMA = SMA.calculate({ values: closePrices, period: shortPeriod });
  const longSMA = SMA.calculate({ values: closePrices, period: longPeriod });

  if (shortSMA.length < 2 || longSMA.length < 2) return null;

  // Align arrays - longSMA is shorter, so offset shortSMA
  const offset = shortSMA.length - longSMA.length;
  const currentShort = shortSMA[shortSMA.length - 1];
  const prevShort = shortSMA[shortSMA.length - 2];
  const currentLong = longSMA[longSMA.length - 1];
  const prevLong = longSMA[longSMA.length - 2];

  if (prevShort <= prevLong && currentShort > currentLong) {
    return 'bullish_crossover';
  }
  if (prevShort >= prevLong && currentShort < currentLong) {
    return 'bearish_crossover';
  }
  return currentShort > currentLong ? 'bullish' : 'bearish';
}

/**
 * Calculate MACD
 */
function calculateMACD(closePrices) {
  const result = MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (result.length === 0) return null;

  const latest = result[result.length - 1];
  return {
    macd: latest.MACD,
    signal: latest.signal,
    histogram: latest.histogram,
  };
}

/**
 * Calculate Bollinger Bands
 */
function calculateBollingerBands(closePrices, period = 20, stdDev = 2) {
  const result = BollingerBands.calculate({
    values: closePrices,
    period,
    stdDev,
  });

  if (result.length === 0) return null;

  const latest = result[result.length - 1];
  return {
    upper: latest.upper,
    middle: latest.middle,
    lower: latest.lower,
    currentPrice: closePrices[closePrices.length - 1],
  };
}

/**
 * Run all technical analysis for a stock
 */
function analyzeStock(closePrices) {
  return {
    rsi: calculateRSI(closePrices),
    sma20: calculateSMA(closePrices, 20),
    sma50: calculateSMA(closePrices, 50),
    ema12: calculateEMA(closePrices, 12),
    ema26: calculateEMA(closePrices, 26),
    smaCrossover: detectSMACrossover(closePrices, 20, 50),
    macd: calculateMACD(closePrices),
    bollingerBands: calculateBollingerBands(closePrices),
  };
}

module.exports = {
  calculateRSI,
  calculateSMA,
  calculateEMA,
  detectSMACrossover,
  calculateMACD,
  calculateBollingerBands,
  analyzeStock,
};
