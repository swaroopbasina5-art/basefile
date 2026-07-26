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
const {
  assessFloodRisk,
  evaluateRainfallTriggers,
  evaluateFloodRiskTriggers,
} = require('../src/climateTriggerEngine');
const { summarizeForecast } = require('../src/weatherApi');

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

// --- Rainfall Forecast Summarization ---
console.log('\nRainfall Forecast Summarization:');

const dryHourly = Array.from({ length: 12 }, (_, i) => ({
  time: `2026-07-26T${String(i).padStart(2, '0')}:00`,
  precipitationMm: 0,
  precipitationProbability: 5,
}));
const drySummary = summarizeForecast(dryHourly);
assert(drySummary.totalMm === 0, 'Dry window totals 0mm');
assert(drySummary.maxConsecutiveWetHours === 0, 'Dry window has 0 consecutive wet hours');

const wetHourly = Array.from({ length: 12 }, (_, i) => ({
  time: `2026-07-26T${String(i).padStart(2, '0')}:00`,
  precipitationMm: i < 7 ? 8 : 0,
  precipitationProbability: i < 7 ? 90 : 10,
}));
const wetSummary = summarizeForecast(wetHourly);
assert(wetSummary.totalMm === 56, `Wet window totals 56mm: ${wetSummary.totalMm}`);
assert(wetSummary.maxHourlyMm === 8, 'Peak hourly intensity is 8mm/hr');
assert(wetSummary.maxConsecutiveWetHours === 7, '7 consecutive wet hours detected');

// --- Flood Risk Assessment ---
console.log('\nFlood Risk Assessment:');

const minimalRisk = assessFloodRisk({ totalMm: 2, maxHourlyMm: 1 });
assert(minimalRisk.level === 'minimal', 'Low totals/intensity yield minimal flood risk');

const severeRisk = assessFloodRisk({ totalMm: 120, maxHourlyMm: 20 });
assert(severeRisk.level === 'severe', 'High totals & intensity yield severe flood risk');

const intensityDrivenRisk = assessFloodRisk({ totalMm: 5, maxHourlyMm: 16 });
assert(intensityDrivenRisk.level === 'severe', 'Single cloudburst hour alone triggers severe risk');

// --- Rainfall Triggers ---
console.log('\nRainfall Triggers:');

const locationForecasts = [
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, forecast: { summary: wetSummary } },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, forecast: { summary: drySummary } },
];

const rainfallTriggers = [
  { location: 'ALL', type: 'total_exceeds', thresholdMm: 50, action: 'flood_alert', message: 'heavy rain expected' },
  { location: 'ALL', type: 'total_below', thresholdMm: 1, action: 'dry_alert', message: 'no rain expected' },
];

const rainResult = evaluateRainfallTriggers(locationForecasts, rainfallTriggers);
assert(rainResult.length === 2, 'Fires 2 triggers (Mumbai total_exceeds, Bengaluru total_below)');
assert(rainResult.find((r) => r.location === 'Mumbai' && r.type === 'total_exceeds'), 'Mumbai total_exceeds fired');
assert(rainResult.find((r) => r.location === 'Bengaluru' && r.type === 'total_below'), 'Bengaluru total_below fired');

// --- Flood Risk Triggers (street flooding) ---
console.log('\nFlood Risk Triggers:');

const floodTriggers = [
  { location: 'ALL', minLevel: 'moderate', action: 'street_flooding_alert', message: 'street flooding possible' },
];
const floodResult = evaluateFloodRiskTriggers(locationForecasts, floodTriggers);
assert(floodResult.length === 1, 'Only Mumbai crosses moderate+ flood risk');
assert(floodResult[0].location === 'Mumbai', 'Flood risk trigger fired for Mumbai');

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
