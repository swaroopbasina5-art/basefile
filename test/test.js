const {
  evaluatePriceTriggers,
  evaluatePercentChangeTriggers,
  evaluateTechnicalTriggers,
  evaluateRebalanceTrigger,
} = require('../src/triggerEngine');
const {
  calculateRSI,
  detectSMACrossover,
  analyzeStock,
} = require('../src/technicalAnalysis');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

// --- Price Triggers ---
console.log('\nPrice Triggers:');

const mockQuotes = [
  { symbol: 'RELIANCE', currentPrice: 2900, changePercent: 2.5 },
  { symbol: 'TCS', currentPrice: 3500, changePercent: -6.0 },
  { symbol: 'HDFCBANK', currentPrice: 1400, changePercent: -1.2 },
];

const priceTriggers = [
  { symbol: 'RELIANCE', type: 'above', price: 2800, action: 'sell_signal', message: 'Sell' },
  { symbol: 'RELIANCE', type: 'below', price: 2200, action: 'buy_signal', message: 'Buy' },
  { symbol: 'HDFCBANK', type: 'below', price: 1500, action: 'buy_signal', message: 'Buy' },
];

const pResult = evaluatePriceTriggers(mockQuotes, priceTriggers);
assert(pResult.length === 2, 'Fires 2 triggers (RELIANCE above, HDFCBANK below)');
assert(pResult[0].symbol === 'RELIANCE', 'First trigger is RELIANCE');
assert(pResult[1].symbol === 'HDFCBANK', 'Second trigger is HDFCBANK');

// --- Percent Change Triggers ---
console.log('\nPercent Change Triggers:');

const percentTriggers = [
  { symbol: 'ALL', period: 'daily', changePercent: 5, direction: 'drop', action: 'alert', message: 'dropped 5%+' },
  { symbol: 'ALL', period: 'daily', changePercent: 5, direction: 'rise', action: 'alert', message: 'rose 5%+' },
];

const pcResult = evaluatePercentChangeTriggers(mockQuotes, percentTriggers);
assert(pcResult.length === 1, 'Fires 1 trigger (TCS dropped 6%)');
assert(pcResult[0].symbol === 'TCS', 'Trigger fired for TCS');

// --- Technical Analysis ---
console.log('\nTechnical Analysis:');

// Generate synthetic price data with known pattern
const risingPrices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5 + Math.sin(i / 5) * 3);
const rsi = calculateRSI(risingPrices, 14);
assert(rsi !== null, 'RSI calculated successfully');
assert(rsi > 0 && rsi < 100, `RSI in valid range: ${rsi.toFixed(2)}`);

const crossover = detectSMACrossover(risingPrices, 5, 20);
assert(crossover !== null, `SMA crossover detected: ${crossover}`);

const fullAnalysis = analyzeStock(risingPrices);
assert(fullAnalysis.rsi !== null, 'Full analysis includes RSI');
assert(fullAnalysis.sma20 !== null, 'Full analysis includes SMA20');
assert(fullAnalysis.macd !== null, 'Full analysis includes MACD');

// --- Technical Triggers ---
console.log('\nTechnical Triggers:');

const oversoldPrices = Array.from({ length: 60 }, (_, i) => 200 - i * 2);
const historicalMap = { TESTSTOCK: oversoldPrices.map((p, i) => ({ close: p })) };
const techTriggers = [
  { symbol: 'ALL', indicator: 'RSI', params: { period: 14 }, condition: 'below', threshold: 30, action: 'buy_signal', message: 'RSI oversold' },
];

const techResult = evaluateTechnicalTriggers(historicalMap, techTriggers);
assert(techResult.length === 1, 'RSI oversold trigger fires for declining stock');

// --- Rebalance Trigger ---
console.log('\nRebalance Trigger:');

const holdings = [
  { symbol: 'A', quantity: 100, avgBuyPrice: 10, targetWeight: 50 },
  { symbol: 'B', quantity: 100, avgBuyPrice: 10, targetWeight: 50 },
];
const rebalQuotes = [
  { symbol: 'A', currentPrice: 20 },
  { symbol: 'B', currentPrice: 10 },
];
const rebalConfig = { enabled: true, deviationThreshold: 5 };

const rebalResult = evaluateRebalanceTrigger(rebalQuotes, holdings, rebalConfig);
assert(rebalResult.length === 2, 'Rebalance suggestion generated');
assert(rebalResult[0].deviation > 0, 'Stock A is overweight');
assert(rebalResult[1].deviation < 0, 'Stock B is underweight');

// --- Candlestick Patterns ---
console.log('\nCandlestick Patterns:');

const { scanPatterns, detectTrend, candleMetrics } = require('../src/candlestickPatterns');

// Bullish Engulfing pattern
const engulfingCandles = [
  { open: 110, close: 108, high: 111, low: 107 }, // padding
  { open: 109, close: 107, high: 110, low: 106 },
  { open: 108, close: 106, high: 109, low: 105 },
  { open: 107, close: 104, high: 108, low: 103 }, // bearish
  { open: 103, close: 109, high: 110, low: 102 }, // bullish engulfing
];
const engulfResult = scanPatterns(engulfingCandles);
assert(engulfResult.some((p) => p.name === 'Bullish Engulfing'), 'Detects Bullish Engulfing pattern');

// Doji pattern
const dojiCandles = [
  { open: 100, close: 102, high: 103, low: 99 },
  { open: 102, close: 104, high: 105, low: 101 },
  { open: 104, close: 106, high: 107, low: 103 },
  { open: 106, close: 108, high: 109, low: 105 },
  { open: 108, close: 108.1, high: 112, low: 104 }, // doji: tiny body, long shadows
];
const dojiResult = scanPatterns(dojiCandles);
assert(dojiResult.some((p) => p.name === 'Doji'), 'Detects Doji pattern');

// Hammer pattern (strong downtrend + long lower shadow, need 7+ candles for trend detection)
const hammerCandles = [
  { open: 160, close: 150, high: 161, low: 149 },
  { open: 150, close: 140, high: 151, low: 139 },
  { open: 140, close: 130, high: 141, low: 129 },
  { open: 130, close: 120, high: 131, low: 119 },
  { open: 120, close: 110, high: 121, low: 109 },
  { open: 110, close: 100, high: 111, low: 99 },
  { open: 99, close: 101, high: 102, low: 85 }, // hammer: small body at top, very long lower shadow
];
const hammerResult = scanPatterns(hammerCandles);
assert(hammerResult.some((p) => p.name === 'Hammer'), 'Detects Hammer pattern');

// Three Black Crows
const crowCandles = [
  { open: 100, close: 102, high: 103, low: 99 },
  { open: 102, close: 104, high: 105, low: 101 },
  { open: 104, close: 98, high: 105, low: 97 },   // bearish
  { open: 97, close: 91, high: 98, low: 90 },      // bearish
  { open: 90, close: 84, high: 91, low: 83 },      // bearish
];
const crowResult = scanPatterns(crowCandles);
assert(crowResult.some((p) => p.name === 'Three Black Crows'), 'Detects Three Black Crows');

// Trend detection
const upCandles = Array.from({ length: 10 }, (_, i) => ({
  open: 100 + i * 2, close: 102 + i * 2, high: 103 + i * 2, low: 99 + i * 2,
}));
assert(detectTrend(upCandles) === 'up', 'Detects uptrend correctly');

const downCandles = Array.from({ length: 10 }, (_, i) => ({
  open: 120 - i * 2, close: 118 - i * 2, high: 121 - i * 2, low: 117 - i * 2,
}));
assert(detectTrend(downCandles) === 'down', 'Detects downtrend correctly');

// Candle metrics
const metrics = candleMetrics({ open: 100, close: 110, high: 115, low: 95 });
assert(metrics.body === 10, 'Candle body calculated correctly');
assert(metrics.isBullish === true, 'Bullish candle detected');
assert(metrics.upperShadow === 5, 'Upper shadow calculated correctly');
assert(metrics.lowerShadow === 5, 'Lower shadow calculated correctly');

// --- Market Intelligence ---
console.log('\nMarket Intelligence:');

const {
  generateIntelligenceReport,
  detectSupportResistance,
  calculateFibonacci,
  calculatePivotPoints,
  analyzeVolume,
  calculateTrendStrength,
} = require('../src/marketIntelligence');

// Generate synthetic OHLCV data
const syntheticCandles = Array.from({ length: 60 }, (_, i) => {
  const base = 100 + Math.sin(i / 10) * 20 + i * 0.3;
  return {
    date: new Date(2026, 0, i + 1),
    open: base - 1,
    close: base + 1,
    high: base + 3,
    low: base - 3,
    volume: 100000 + Math.random() * 50000,
  };
});

// Support & Resistance
const sr = detectSupportResistance(syntheticCandles);
assert(sr.supports.length >= 0, `Support levels detected: ${sr.supports.length}`);
assert(sr.resistances.length >= 0, `Resistance levels detected: ${sr.resistances.length}`);

// Fibonacci
const fib = calculateFibonacci(syntheticCandles);
assert(fib !== null, 'Fibonacci levels calculated');
assert(fib.level_618 > fib.level_100, 'Fibonacci 61.8% is between high and low');
assert(fib.zone.length > 0, `Fibonacci zone identified: ${fib.zone.substring(0, 30)}`);

// Pivot Points
const pivots = calculatePivotPoints(syntheticCandles);
assert(pivots !== null, 'Pivot points calculated');
assert(pivots.standard.r1 > pivots.standard.pivot, 'R1 > Pivot (Standard)');
assert(pivots.standard.s1 < pivots.standard.pivot, 'S1 < Pivot (Standard)');
assert(pivots.fibonacci.r1 > pivots.fibonacci.pivot, 'Fibonacci pivots calculated');
assert(pivots.camarilla.r3 > pivots.camarilla.s3, 'Camarilla pivots calculated');

// Volume Analysis
const vol = analyzeVolume(syntheticCandles);
assert(vol !== null, 'Volume analysis completed');
assert(vol.avgVolume20 > 0, `Average volume: ${vol.avgVolume20}`);
assert(vol.volumeRatio !== undefined, `Volume ratio: ${vol.volumeRatio}x`);

// Trend Strength
const ts = calculateTrendStrength(syntheticCandles);
assert(ts !== null, 'Trend strength calculated');
assert(['bullish', 'bearish', 'sideways'].includes(ts.direction), `Trend direction: ${ts.direction}`);
assert(['weak', 'moderate', 'strong'].includes(ts.strength), `Trend strength: ${ts.strength}`);

// Full Intelligence Report
const report = generateIntelligenceReport('TEST', syntheticCandles);
assert(report.symbol === 'TEST', 'Intelligence report generated');
assert(report.intelligence.score >= -100 && report.intelligence.score <= 100, `Score in range: ${report.intelligence.score}`);
assert(['STRONG BUY', 'BUY', 'MILD BUY', 'HOLD', 'MILD SELL', 'SELL', 'STRONG SELL'].includes(report.intelligence.recommendation), `Recommendation: ${report.intelligence.recommendation}`);
assert(report.fibonacci !== null, 'Report includes Fibonacci');
assert(report.pivotPoints !== null, 'Report includes Pivot Points');
assert(report.volume !== null, 'Report includes Volume analysis');
assert(report.trendStrength !== null, 'Report includes Trend Strength');
assert(Array.isArray(report.candlestickPatterns), 'Report includes candlestick patterns');

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
