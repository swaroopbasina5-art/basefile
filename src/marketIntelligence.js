/**
 * Market Intelligence Engine
 * Combines candlestick patterns, support/resistance, volume analysis,
 * Fibonacci levels, pivot points, and trend strength into actionable intelligence
 */

const { scanPatterns, detectTrend } = require('./candlestickPatterns');
const { analyzeStock, calculateSMA } = require('./technicalAnalysis');

// =============================================
// SUPPORT & RESISTANCE DETECTION
// =============================================

function detectSupportResistance(candles, lookback = 20) {
  if (candles.length < lookback) return { supports: [], resistances: [] };

  const recent = candles.slice(-lookback);
  const supports = [];
  const resistances = [];

  // Find local minima (supports) and maxima (resistances)
  for (let i = 2; i < recent.length - 2; i++) {
    const curr = recent[i];

    // Local minimum - support
    if (
      curr.low < recent[i - 1].low &&
      curr.low < recent[i - 2].low &&
      curr.low < recent[i + 1].low &&
      curr.low < recent[i + 2].low
    ) {
      supports.push(curr.low);
    }

    // Local maximum - resistance
    if (
      curr.high > recent[i - 1].high &&
      curr.high > recent[i - 2].high &&
      curr.high > recent[i + 1].high &&
      curr.high > recent[i + 2].high
    ) {
      resistances.push(curr.high);
    }
  }

  // Cluster nearby levels (within 1.5% of each other)
  const clusterLevels = (levels) => {
    if (levels.length === 0) return [];
    levels.sort((a, b) => a - b);
    const clusters = [];
    let cluster = [levels[0]];

    for (let i = 1; i < levels.length; i++) {
      if ((levels[i] - levels[i - 1]) / levels[i - 1] < 0.015) {
        cluster.push(levels[i]);
      } else {
        clusters.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
        cluster = [levels[i]];
      }
    }
    clusters.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
    return clusters;
  };

  return {
    supports: clusterLevels(supports),
    resistances: clusterLevels(resistances),
  };
}

// =============================================
// FIBONACCI RETRACEMENT LEVELS
// =============================================

function calculateFibonacci(candles, lookback = 30) {
  if (candles.length < lookback) return null;

  const recent = candles.slice(-lookback);
  const high = Math.max(...recent.map((c) => c.high));
  const low = Math.min(...recent.map((c) => c.low));
  const diff = high - low;
  const currentPrice = candles[candles.length - 1].close;

  const levels = {
    level_0: high,
    level_236: high - diff * 0.236,
    level_382: high - diff * 0.382,
    level_500: high - diff * 0.5,
    level_618: high - diff * 0.618,
    level_786: high - diff * 0.786,
    level_100: low,
    swingHigh: high,
    swingLow: low,
    currentPrice,
  };

  // Determine which zone the price is in
  let zone = '';
  if (currentPrice > levels.level_236) zone = 'Above 23.6% - Strong uptrend';
  else if (currentPrice > levels.level_382) zone = '23.6%-38.2% - Mild pullback';
  else if (currentPrice > levels.level_500) zone = '38.2%-50% - Moderate retracement';
  else if (currentPrice > levels.level_618) zone = '50%-61.8% - Deep retracement (key zone)';
  else if (currentPrice > levels.level_786) zone = '61.8%-78.6% - Very deep pullback';
  else zone = 'Below 78.6% - Trend reversal likely';

  levels.zone = zone;
  return levels;
}

// =============================================
// PIVOT POINTS (Standard, Fibonacci, Camarilla)
// =============================================

function calculatePivotPoints(candles) {
  if (candles.length < 2) return null;

  const prev = candles[candles.length - 2]; // previous day
  const { high, low, close } = prev;
  const pivot = (high + low + close) / 3;

  return {
    standard: {
      r3: high + 2 * (pivot - low),
      r2: pivot + (high - low),
      r1: 2 * pivot - low,
      pivot,
      s1: 2 * pivot - high,
      s2: pivot - (high - low),
      s3: low - 2 * (high - pivot),
    },
    fibonacci: {
      r3: pivot + 1.0 * (high - low),
      r2: pivot + 0.618 * (high - low),
      r1: pivot + 0.382 * (high - low),
      pivot,
      s1: pivot - 0.382 * (high - low),
      s2: pivot - 0.618 * (high - low),
      s3: pivot - 1.0 * (high - low),
    },
    camarilla: {
      r4: close + (high - low) * 1.1 / 2,
      r3: close + (high - low) * 1.1 / 4,
      r2: close + (high - low) * 1.1 / 6,
      r1: close + (high - low) * 1.1 / 12,
      pivot,
      s1: close - (high - low) * 1.1 / 12,
      s2: close - (high - low) * 1.1 / 6,
      s3: close - (high - low) * 1.1 / 4,
      s4: close - (high - low) * 1.1 / 2,
    },
  };
}

// =============================================
// VOLUME ANALYSIS
// =============================================

function analyzeVolume(candles) {
  if (candles.length < 20) return null;

  const recent = candles.slice(-20);
  const avgVolume = recent.reduce((sum, c) => sum + (c.volume || 0), 0) / recent.length;
  const latestVolume = candles[candles.length - 1].volume || 0;
  const prevVolume = candles[candles.length - 2].volume || 0;

  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 0;
  const latestCandle = candles[candles.length - 1];
  const priceChange = latestCandle.close - latestCandle.open;

  // Volume trend (5-day vs 20-day average)
  const recent5Vol = candles.slice(-5).reduce((sum, c) => sum + (c.volume || 0), 0) / 5;
  const volumeTrend = avgVolume > 0 ? recent5Vol / avgVolume : 0;

  let signal = 'neutral';
  let description = '';

  if (volumeRatio > 2 && priceChange > 0) {
    signal = 'strong_bullish';
    description = 'Very high volume with price rise - strong buying pressure';
  } else if (volumeRatio > 2 && priceChange < 0) {
    signal = 'strong_bearish';
    description = 'Very high volume with price drop - strong selling pressure (possible capitulation)';
  } else if (volumeRatio > 1.5 && priceChange > 0) {
    signal = 'bullish';
    description = 'Above-average volume with price rise - healthy buying';
  } else if (volumeRatio > 1.5 && priceChange < 0) {
    signal = 'bearish';
    description = 'Above-average volume with price drop - distribution phase';
  } else if (volumeRatio < 0.5 && priceChange > 0) {
    signal = 'weak_bullish';
    description = 'Low volume rise - rally lacks conviction, may reverse';
  } else if (volumeRatio < 0.5 && priceChange < 0) {
    signal = 'weak_bearish';
    description = 'Low volume drop - selling exhaustion, may bounce';
  } else {
    description = 'Normal volume activity';
  }

  return {
    latestVolume,
    avgVolume20: Math.round(avgVolume),
    volumeRatio: volumeRatio.toFixed(2),
    volumeTrend: volumeTrend.toFixed(2),
    signal,
    description,
  };
}

// =============================================
// TREND STRENGTH (ADX-like approximation)
// =============================================

function calculateTrendStrength(candles) {
  if (candles.length < 20) return null;

  const closes = candles.slice(-20).map((c) => c.close);
  let upMoves = 0;
  let downMoves = 0;
  let totalMoves = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) upMoves += change;
    else downMoves += Math.abs(change);
    totalMoves += Math.abs(change);
  }

  const bullPower = totalMoves > 0 ? (upMoves / totalMoves) * 100 : 50;
  const avgChange = totalMoves / (closes.length - 1);
  const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
  const volatility = (avgChange / avgPrice) * 100;

  // Directional strength
  const direction = bullPower > 55 ? 'bullish' : bullPower < 45 ? 'bearish' : 'sideways';

  let strength = 'weak';
  if (Math.abs(bullPower - 50) > 20) strength = 'strong';
  else if (Math.abs(bullPower - 50) > 10) strength = 'moderate';

  return {
    bullPower: bullPower.toFixed(1),
    direction,
    strength,
    volatility: volatility.toFixed(2),
    description: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} trend (Bull Power: ${bullPower.toFixed(1)}%, Volatility: ${volatility.toFixed(2)}%)`,
  };
}

// =============================================
// MARKET INTELLIGENCE SCORE
// =============================================

function calculateIntelligenceScore(patterns, technical, volume, trendStr) {
  let score = 0; // -100 (very bearish) to +100 (very bullish)
  const reasons = [];

  // Candlestick patterns (weight: 25)
  for (const p of patterns) {
    const multiplier = p.strength;
    if (p.type === 'bullish') {
      score += 8 * multiplier;
      reasons.push(`${p.name}: +${8 * multiplier}`);
    } else if (p.type === 'bearish') {
      score -= 8 * multiplier;
      reasons.push(`${p.name}: -${8 * multiplier}`);
    }
  }

  // RSI (weight: 20)
  if (technical.rsi !== null) {
    if (technical.rsi < 30) { score += 20; reasons.push(`RSI oversold (${technical.rsi.toFixed(1)}): +20`); }
    else if (technical.rsi < 40) { score += 10; reasons.push(`RSI low (${technical.rsi.toFixed(1)}): +10`); }
    else if (technical.rsi > 70) { score -= 20; reasons.push(`RSI overbought (${technical.rsi.toFixed(1)}): -20`); }
    else if (technical.rsi > 60) { score -= 10; reasons.push(`RSI high (${technical.rsi.toFixed(1)}): -10`); }
  }

  // SMA crossover (weight: 15)
  if (technical.smaCrossover === 'bullish_crossover') { score += 15; reasons.push('Golden Cross: +15'); }
  else if (technical.smaCrossover === 'bearish_crossover') { score -= 15; reasons.push('Death Cross: -15'); }
  else if (technical.smaCrossover === 'bullish') { score += 5; reasons.push('Above SMA: +5'); }
  else if (technical.smaCrossover === 'bearish') { score -= 5; reasons.push('Below SMA: -5'); }

  // MACD (weight: 15)
  if (technical.macd) {
    if (technical.macd.histogram > 0) { score += 10; reasons.push(`MACD positive: +10`); }
    else { score -= 10; reasons.push(`MACD negative: -10`); }
  }

  // Volume (weight: 15)
  if (volume) {
    if (volume.signal === 'strong_bullish') { score += 15; reasons.push('High vol + rise: +15'); }
    else if (volume.signal === 'strong_bearish') { score -= 15; reasons.push('High vol + drop: -15'); }
    else if (volume.signal === 'bullish') { score += 8; reasons.push('Good vol + rise: +8'); }
    else if (volume.signal === 'bearish') { score -= 8; reasons.push('Good vol + drop: -8'); }
    else if (volume.signal === 'weak_bullish') { score -= 3; reasons.push('Low vol rise: -3'); }
  }

  // Trend strength (weight: 10)
  if (trendStr) {
    if (trendStr.direction === 'bullish' && trendStr.strength === 'strong') { score += 10; reasons.push('Strong uptrend: +10'); }
    else if (trendStr.direction === 'bearish' && trendStr.strength === 'strong') { score -= 10; reasons.push('Strong downtrend: -10'); }
  }

  // Clamp to -100 to +100
  score = Math.max(-100, Math.min(100, score));

  let recommendation = 'HOLD';
  if (score >= 40) recommendation = 'STRONG BUY';
  else if (score >= 20) recommendation = 'BUY';
  else if (score >= 5) recommendation = 'MILD BUY';
  else if (score <= -40) recommendation = 'STRONG SELL';
  else if (score <= -20) recommendation = 'SELL';
  else if (score <= -5) recommendation = 'MILD SELL';

  return { score, recommendation, reasons };
}

// =============================================
// MAIN INTELLIGENCE REPORT
// =============================================

/**
 * Generate full market intelligence report for a stock
 */
function generateIntelligenceReport(symbol, candles) {
  if (!candles || candles.length < 20) {
    return { symbol, error: 'Insufficient data for analysis' };
  }

  const closePrices = candles.map((c) => c.close);
  const currentPrice = closePrices[closePrices.length - 1];

  // Run all analyses
  const patterns = scanPatterns(candles);
  const technical = analyzeStock(closePrices);
  const supportResistance = detectSupportResistance(candles);
  const fibonacci = calculateFibonacci(candles);
  const pivotPoints = calculatePivotPoints(candles);
  const volume = analyzeVolume(candles);
  const trendStrength = calculateTrendStrength(candles);
  const trend = detectTrend(candles);

  // Combined intelligence score
  const intelligence = calculateIntelligenceScore(patterns, technical, volume, trendStrength);

  return {
    symbol,
    currentPrice,
    timestamp: new Date().toISOString(),
    trend,

    candlestickPatterns: patterns,

    technicalIndicators: {
      rsi: technical.rsi,
      sma20: technical.sma20,
      sma50: technical.sma50,
      ema12: technical.ema12,
      ema26: technical.ema26,
      smaCrossover: technical.smaCrossover,
      macd: technical.macd,
      bollingerBands: technical.bollingerBands,
    },

    supportResistance,
    fibonacci,
    pivotPoints,
    volume,
    trendStrength,

    intelligence: {
      score: intelligence.score,
      recommendation: intelligence.recommendation,
      reasons: intelligence.reasons,
    },
  };
}

module.exports = {
  generateIntelligenceReport,
  detectSupportResistance,
  calculateFibonacci,
  calculatePivotPoints,
  analyzeVolume,
  calculateTrendStrength,
  calculateIntelligenceScore,
};
