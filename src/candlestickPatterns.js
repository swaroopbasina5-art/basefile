/**
 * Candlestick Pattern Recognition Engine
 * Detects 20+ candlestick patterns with bullish/bearish signals
 */

// Helper: body and shadow sizes
function candleMetrics(candle) {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const isBullish = candle.close > candle.open;
  return { body, range, upperShadow, lowerShadow, isBullish };
}

// --- Single Candle Patterns ---

function isDoji(candle) {
  const { body, range } = candleMetrics(candle);
  if (range === 0) return false;
  return body / range < 0.1;
}

function isDragonflyDoji(candle) {
  const { body, range, lowerShadow, upperShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return body / range < 0.1 && lowerShadow / range > 0.6 && upperShadow / range < 0.1;
}

function isGravestoneDoji(candle) {
  const { body, range, lowerShadow, upperShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return body / range < 0.1 && upperShadow / range > 0.6 && lowerShadow / range < 0.1;
}

function isHammer(candle, trend) {
  const { body, range, lowerShadow, upperShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return (
    trend === 'down' &&
    lowerShadow >= body * 2 &&
    upperShadow / range < 0.15 &&
    body / range > 0.1
  );
}

function isInvertedHammer(candle, trend) {
  const { body, range, lowerShadow, upperShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return (
    trend === 'down' &&
    upperShadow >= body * 2 &&
    lowerShadow / range < 0.15 &&
    body / range > 0.1
  );
}

function isHangingMan(candle, trend) {
  const { body, range, lowerShadow, upperShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return (
    trend === 'up' &&
    lowerShadow >= body * 2 &&
    upperShadow / range < 0.15 &&
    body / range > 0.1
  );
}

function isShootingStar(candle, trend) {
  const { body, range, lowerShadow, upperShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return (
    trend === 'up' &&
    upperShadow >= body * 2 &&
    lowerShadow / range < 0.15 &&
    body / range > 0.1
  );
}

function isMarubozu(candle) {
  const { body, range, upperShadow, lowerShadow, isBullish } = candleMetrics(candle);
  if (range === 0) return null;
  if (body / range > 0.9 && upperShadow / range < 0.05 && lowerShadow / range < 0.05) {
    return isBullish ? 'bullish' : 'bearish';
  }
  return null;
}

function isSpinningTop(candle) {
  const { body, range, upperShadow, lowerShadow } = candleMetrics(candle);
  if (range === 0) return false;
  return body / range < 0.3 && upperShadow / range > 0.2 && lowerShadow / range > 0.2;
}

// --- Two Candle Patterns ---

function isBullishEngulfing(prev, curr) {
  const p = candleMetrics(prev);
  const c = candleMetrics(curr);
  return (
    !p.isBullish &&
    c.isBullish &&
    curr.open < prev.close &&
    curr.close > prev.open &&
    c.body > p.body
  );
}

function isBearishEngulfing(prev, curr) {
  const p = candleMetrics(prev);
  const c = candleMetrics(curr);
  return (
    p.isBullish &&
    !c.isBullish &&
    curr.open > prev.close &&
    curr.close < prev.open &&
    c.body > p.body
  );
}

function isPiercing(prev, curr) {
  const p = candleMetrics(prev);
  const c = candleMetrics(curr);
  const midPoint = (prev.open + prev.close) / 2;
  return (
    !p.isBullish &&
    c.isBullish &&
    curr.open < prev.low &&
    curr.close > midPoint &&
    curr.close < prev.open
  );
}

function isDarkCloudCover(prev, curr) {
  const p = candleMetrics(prev);
  const c = candleMetrics(curr);
  const midPoint = (prev.open + prev.close) / 2;
  return (
    p.isBullish &&
    !c.isBullish &&
    curr.open > prev.high &&
    curr.close < midPoint &&
    curr.close > prev.open
  );
}

function isTweezerBottom(prev, curr) {
  const tolerance = (prev.high - prev.low) * 0.05;
  return (
    Math.abs(prev.low - curr.low) <= tolerance &&
    !candleMetrics(prev).isBullish &&
    candleMetrics(curr).isBullish
  );
}

function isTweezerTop(prev, curr) {
  const tolerance = (prev.high - prev.low) * 0.05;
  return (
    Math.abs(prev.high - curr.high) <= tolerance &&
    candleMetrics(prev).isBullish &&
    !candleMetrics(curr).isBullish
  );
}

// --- Three Candle Patterns ---

function isMorningStar(c1, c2, c3) {
  const m1 = candleMetrics(c1);
  const m2 = candleMetrics(c2);
  const m3 = candleMetrics(c3);
  return (
    !m1.isBullish &&
    m1.body > m1.range * 0.5 &&
    m2.body < m2.range * 0.3 &&
    m3.isBullish &&
    m3.body > m3.range * 0.5 &&
    c2.close < c1.close &&
    c3.close > (c1.open + c1.close) / 2
  );
}

function isEveningStar(c1, c2, c3) {
  const m1 = candleMetrics(c1);
  const m2 = candleMetrics(c2);
  const m3 = candleMetrics(c3);
  return (
    m1.isBullish &&
    m1.body > m1.range * 0.5 &&
    m2.body < m2.range * 0.3 &&
    !m3.isBullish &&
    m3.body > m3.range * 0.5 &&
    c2.close > c1.close &&
    c3.close < (c1.open + c1.close) / 2
  );
}

function isThreeWhiteSoldiers(c1, c2, c3) {
  const m1 = candleMetrics(c1);
  const m2 = candleMetrics(c2);
  const m3 = candleMetrics(c3);
  return (
    m1.isBullish && m2.isBullish && m3.isBullish &&
    c2.open > c1.open && c2.close > c1.close &&
    c3.open > c2.open && c3.close > c2.close &&
    m1.body > m1.range * 0.5 &&
    m2.body > m2.range * 0.5 &&
    m3.body > m3.range * 0.5
  );
}

function isThreeBlackCrows(c1, c2, c3) {
  const m1 = candleMetrics(c1);
  const m2 = candleMetrics(c2);
  const m3 = candleMetrics(c3);
  return (
    !m1.isBullish && !m2.isBullish && !m3.isBullish &&
    c2.open < c1.open && c2.close < c1.close &&
    c3.open < c2.open && c3.close < c2.close &&
    m1.body > m1.range * 0.5 &&
    m2.body > m2.range * 0.5 &&
    m3.body > m3.range * 0.5
  );
}

function isThreeInsideUp(c1, c2, c3) {
  const m1 = candleMetrics(c1);
  const m3 = candleMetrics(c3);
  return (
    !m1.isBullish &&
    isBullishEngulfing({ open: c2.open, close: c2.close, high: c2.high, low: c2.low },
                        { open: c1.close, close: c1.open, high: c1.high, low: c1.low }) === false &&
    c2.close > c1.close && c2.close < c1.open &&
    c2.open > c1.close && c2.open < c1.open &&
    m3.isBullish && c3.close > c1.open
  );
}

// --- Trend Detection ---

function detectTrend(candles, lookback = 5) {
  if (candles.length < lookback) return 'neutral';
  const recent = candles.slice(-lookback);
  const first = recent[0].close;
  const last = recent[recent.length - 1].close;
  const change = ((last - first) / first) * 100;

  if (change > 2) return 'up';
  if (change < -2) return 'down';
  return 'neutral';
}

/**
 * Scan candles for all patterns - returns array of detected patterns
 */
function scanPatterns(candles) {
  if (!candles || candles.length < 5) return [];

  const patterns = [];
  const n = candles.length;
  const trend = detectTrend(candles.slice(0, -1), 5);

  const latest = candles[n - 1];
  const prev = candles[n - 2];
  const prev2 = candles[n - 3];

  // Single candle patterns
  if (isDoji(latest)) {
    patterns.push({
      name: 'Doji',
      type: 'neutral',
      signal: trend === 'up' ? 'bearish_reversal' : trend === 'down' ? 'bullish_reversal' : 'indecision',
      strength: 1,
      description: 'Market indecision - potential trend reversal',
    });
  }

  if (isDragonflyDoji(latest)) {
    patterns.push({
      name: 'Dragonfly Doji',
      type: 'bullish',
      signal: 'bullish_reversal',
      strength: 2,
      description: 'Buyers rejected lower prices - bullish reversal signal',
    });
  }

  if (isGravestoneDoji(latest)) {
    patterns.push({
      name: 'Gravestone Doji',
      type: 'bearish',
      signal: 'bearish_reversal',
      strength: 2,
      description: 'Sellers rejected higher prices - bearish reversal signal',
    });
  }

  if (isHammer(latest, trend)) {
    patterns.push({
      name: 'Hammer',
      type: 'bullish',
      signal: 'bullish_reversal',
      strength: 2,
      description: 'Hammer at bottom of downtrend - strong bullish reversal',
    });
  }

  if (isInvertedHammer(latest, trend)) {
    patterns.push({
      name: 'Inverted Hammer',
      type: 'bullish',
      signal: 'bullish_reversal',
      strength: 1,
      description: 'Inverted hammer after downtrend - potential bullish reversal',
    });
  }

  if (isHangingMan(latest, trend)) {
    patterns.push({
      name: 'Hanging Man',
      type: 'bearish',
      signal: 'bearish_reversal',
      strength: 2,
      description: 'Hanging man at top of uptrend - bearish warning',
    });
  }

  if (isShootingStar(latest, trend)) {
    patterns.push({
      name: 'Shooting Star',
      type: 'bearish',
      signal: 'bearish_reversal',
      strength: 2,
      description: 'Shooting star at top of uptrend - strong bearish reversal',
    });
  }

  const marubozu = isMarubozu(latest);
  if (marubozu) {
    patterns.push({
      name: `${marubozu === 'bullish' ? 'Bullish' : 'Bearish'} Marubozu`,
      type: marubozu,
      signal: marubozu === 'bullish' ? 'strong_bullish' : 'strong_bearish',
      strength: 3,
      description: `Full-body ${marubozu} candle - strong ${marubozu} momentum`,
    });
  }

  if (isSpinningTop(latest)) {
    patterns.push({
      name: 'Spinning Top',
      type: 'neutral',
      signal: 'indecision',
      strength: 1,
      description: 'Spinning top - market undecided, wait for confirmation',
    });
  }

  // Two candle patterns
  if (isBullishEngulfing(prev, latest)) {
    patterns.push({
      name: 'Bullish Engulfing',
      type: 'bullish',
      signal: 'bullish_reversal',
      strength: 3,
      description: 'Bullish engulfing - strong reversal signal, buyers taking control',
    });
  }

  if (isBearishEngulfing(prev, latest)) {
    patterns.push({
      name: 'Bearish Engulfing',
      type: 'bearish',
      signal: 'bearish_reversal',
      strength: 3,
      description: 'Bearish engulfing - strong reversal signal, sellers taking control',
    });
  }

  if (isPiercing(prev, latest)) {
    patterns.push({
      name: 'Piercing Line',
      type: 'bullish',
      signal: 'bullish_reversal',
      strength: 2,
      description: 'Piercing line pattern - moderately bullish reversal',
    });
  }

  if (isDarkCloudCover(prev, latest)) {
    patterns.push({
      name: 'Dark Cloud Cover',
      type: 'bearish',
      signal: 'bearish_reversal',
      strength: 2,
      description: 'Dark cloud cover - moderately bearish reversal',
    });
  }

  if (isTweezerBottom(prev, latest)) {
    patterns.push({
      name: 'Tweezer Bottom',
      type: 'bullish',
      signal: 'bullish_reversal',
      strength: 2,
      description: 'Tweezer bottom - double support test, bullish reversal',
    });
  }

  if (isTweezerTop(prev, latest)) {
    patterns.push({
      name: 'Tweezer Top',
      type: 'bearish',
      signal: 'bearish_reversal',
      strength: 2,
      description: 'Tweezer top - double resistance test, bearish reversal',
    });
  }

  // Three candle patterns
  if (isMorningStar(prev2, prev, latest)) {
    patterns.push({
      name: 'Morning Star',
      type: 'bullish',
      signal: 'strong_bullish_reversal',
      strength: 3,
      description: 'Morning star - very strong bullish reversal at bottom',
    });
  }

  if (isEveningStar(prev2, prev, latest)) {
    patterns.push({
      name: 'Evening Star',
      type: 'bearish',
      signal: 'strong_bearish_reversal',
      strength: 3,
      description: 'Evening star - very strong bearish reversal at top',
    });
  }

  if (isThreeWhiteSoldiers(prev2, prev, latest)) {
    patterns.push({
      name: 'Three White Soldiers',
      type: 'bullish',
      signal: 'strong_bullish',
      strength: 3,
      description: 'Three white soldiers - strong bullish continuation/reversal',
    });
  }

  if (isThreeBlackCrows(prev2, prev, latest)) {
    patterns.push({
      name: 'Three Black Crows',
      type: 'bearish',
      signal: 'strong_bearish',
      strength: 3,
      description: 'Three black crows - strong bearish continuation/reversal',
    });
  }

  return patterns;
}

module.exports = {
  scanPatterns,
  detectTrend,
  candleMetrics,
};
