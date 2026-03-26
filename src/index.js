require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getStockQuote, getMultipleQuotes, getHistoricalData } = require('./growwApi');
const { analyzeStock } = require('./technicalAnalysis');
const { scanPatterns, detectTrend } = require('./candlestickPatterns');
const { generateIntelligenceReport } = require('./marketIntelligence');
const { startMonitor, runMonitorCycle } = require('./monitor');

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`
Market Portfolio Triggers - Groww Integration
==============================================

Usage:
  node src/index.js <command>

Commands:
  monitor       Start the continuous monitoring daemon
  check         Run a single check cycle (useful for testing)
  quote <SYM>   Get live quote for a stock symbol
  analyze <SYM> Run technical analysis on a stock
  candles <SYM> Scan candlestick patterns for a stock
  intel <SYM>   Full market intelligence report (all tools combined)
  intel-all     Intelligence report for entire portfolio
  portfolio     Show current portfolio status
  help          Show this help message

Market Intelligence includes:
  - 20+ Candlestick patterns (Doji, Hammer, Engulfing, Morning Star, etc.)
  - Support & Resistance levels
  - Fibonacci retracement zones
  - Pivot Points (Standard, Fibonacci, Camarilla)
  - Volume analysis & conviction scoring
  - Trend strength measurement
  - Combined intelligence score (-100 to +100 with BUY/SELL/HOLD)

Configuration:
  Edit config/portfolio.json  - Your portfolio holdings
  Edit config/triggers.json   - Price, % change, and technical triggers
  Copy .env.example to .env   - Gmail credentials and settings

Examples:
  node src/index.js intel RELIANCE
  node src/index.js intel-all
  node src/index.js candles TCS
  node src/index.js monitor
`);
}

async function showQuote(symbol) {
  if (!symbol) {
    console.log('Usage: node src/index.js quote <SYMBOL>');
    return;
  }
  console.log(`Fetching quote for ${symbol}...`);
  const quote = await getStockQuote(symbol);
  if (quote) {
    console.log(`\n${quote.name} (${quote.symbol})`);
    console.log(`  Price:    ₹${quote.currentPrice?.toFixed(2)}`);
    console.log(`  Open:     ₹${quote.open?.toFixed(2)}`);
    console.log(`  High:     ₹${quote.high?.toFixed(2)}`);
    console.log(`  Low:      ₹${quote.low?.toFixed(2)}`);
    console.log(`  Change:   ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent?.toFixed(2)}%`);
    console.log(`  Volume:   ${quote.volume?.toLocaleString()}`);
  } else {
    console.log('Could not fetch quote.');
  }
}

async function runAnalysis(symbol) {
  if (!symbol) {
    console.log('Usage: node src/index.js analyze <SYMBOL>');
    return;
  }
  console.log(`Fetching historical data for ${symbol}...`);
  const history = await getHistoricalData(symbol, 60);

  if (history.length < 50) {
    console.log(`Insufficient data (${history.length} days). Need at least 50 days.`);
    return;
  }

  const closePrices = history.map((h) => h.close);
  const analysis = analyzeStock(closePrices);

  console.log(`\nTechnical Analysis: ${symbol}`);
  console.log('─'.repeat(40));
  console.log(`  RSI(14):       ${analysis.rsi?.toFixed(2) || 'N/A'} ${analysis.rsi < 30 ? '(Oversold)' : analysis.rsi > 70 ? '(Overbought)' : '(Neutral)'}`);
  console.log(`  SMA(20):       ₹${analysis.sma20?.toFixed(2) || 'N/A'}`);
  console.log(`  SMA(50):       ₹${analysis.sma50?.toFixed(2) || 'N/A'}`);
  console.log(`  SMA Crossover: ${analysis.smaCrossover || 'N/A'}`);
  console.log(`  EMA(12):       ₹${analysis.ema12?.toFixed(2) || 'N/A'}`);
  console.log(`  EMA(26):       ₹${analysis.ema26?.toFixed(2) || 'N/A'}`);

  if (analysis.macd) {
    console.log(`  MACD:          ${analysis.macd.macd?.toFixed(2)}`);
    console.log(`  MACD Signal:   ${analysis.macd.signal?.toFixed(2)}`);
    console.log(`  MACD Hist:     ${analysis.macd.histogram?.toFixed(2)}`);
  }

  if (analysis.bollingerBands) {
    const bb = analysis.bollingerBands;
    console.log(`  BB Upper:      ₹${bb.upper?.toFixed(2)}`);
    console.log(`  BB Middle:     ₹${bb.middle?.toFixed(2)}`);
    console.log(`  BB Lower:      ₹${bb.lower?.toFixed(2)}`);
  }
}

async function scanCandlesticks(symbol) {
  if (!symbol) {
    console.log('Usage: node src/index.js candles <SYMBOL>');
    return;
  }
  console.log(`Fetching data for candlestick analysis of ${symbol}...`);
  const history = await getHistoricalData(symbol, 30);

  if (history.length < 5) {
    console.log(`Insufficient data (${history.length} candles). Need at least 5.`);
    return;
  }

  const patterns = scanPatterns(history);
  const trend = detectTrend(history);

  console.log(`\nCandlestick Analysis: ${symbol}`);
  console.log('─'.repeat(50));
  console.log(`  Current Trend: ${trend.toUpperCase()}`);
  console.log(`  Last 3 Candles:`);

  const last3 = history.slice(-3);
  for (const c of last3) {
    const type = c.close >= c.open ? 'BULLISH' : 'BEARISH';
    const body = Math.abs(c.close - c.open).toFixed(2);
    console.log(`    ${c.date ? new Date(c.date).toLocaleDateString('en-IN') : '?'}: O:₹${c.open.toFixed(2)} H:₹${c.high.toFixed(2)} L:₹${c.low.toFixed(2)} C:₹${c.close.toFixed(2)} [${type}, body:${body}]`);
  }

  console.log(`\n  Detected Patterns:`);
  if (patterns.length === 0) {
    console.log('    No significant candlestick patterns detected.');
  } else {
    for (const p of patterns) {
      const stars = '★'.repeat(p.strength) + '☆'.repeat(3 - p.strength);
      const color = p.type === 'bullish' ? '\x1b[32m' : p.type === 'bearish' ? '\x1b[31m' : '\x1b[33m';
      console.log(`    ${color}${stars} ${p.name}\x1b[0m`);
      console.log(`       Signal: ${p.signal} | ${p.description}`);
    }
  }
}

async function runIntelligence(symbol) {
  if (!symbol) {
    console.log('Usage: node src/index.js intel <SYMBOL>');
    return;
  }
  console.log(`Generating full intelligence report for ${symbol}...`);
  const history = await getHistoricalData(symbol, 60);

  if (history.length < 20) {
    console.log(`Insufficient data (${history.length} days). Need at least 20.`);
    return;
  }

  const report = generateIntelligenceReport(symbol, history);

  const scoreBar = (score) => {
    const normalized = Math.round((score + 100) / 200 * 20);
    return '█'.repeat(Math.max(0, normalized)) + '░'.repeat(20 - Math.max(0, normalized));
  };

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  MARKET INTELLIGENCE: ${symbol}`);
  console.log(`  Price: ₹${report.currentPrice.toFixed(2)} | Trend: ${report.trend.toUpperCase()}`);
  console.log(`${'═'.repeat(60)}`);

  // Intelligence Score
  const sc = report.intelligence;
  const scoreColor = sc.score >= 20 ? '\x1b[32m' : sc.score <= -20 ? '\x1b[31m' : '\x1b[33m';
  console.log(`\n  Intelligence Score: ${scoreColor}${sc.score > 0 ? '+' : ''}${sc.score} → ${sc.recommendation}\x1b[0m`);
  console.log(`  ${scoreColor}SELL [${scoreBar(sc.score)}] BUY\x1b[0m`);

  // Candlestick Patterns
  console.log(`\n  Candlestick Patterns:`);
  if (report.candlestickPatterns.length === 0) {
    console.log('    No significant patterns');
  } else {
    for (const p of report.candlestickPatterns) {
      console.log(`    ${'★'.repeat(p.strength)} ${p.name} (${p.type}) - ${p.description}`);
    }
  }

  // Technical Indicators
  const ti = report.technicalIndicators;
  console.log(`\n  Technical Indicators:`);
  console.log(`    RSI(14):     ${ti.rsi?.toFixed(1) || 'N/A'} ${ti.rsi < 30 ? '(OVERSOLD)' : ti.rsi > 70 ? '(OVERBOUGHT)' : ''}`);
  console.log(`    SMA(20):     ₹${ti.sma20?.toFixed(2) || 'N/A'}`);
  console.log(`    SMA(50):     ₹${ti.sma50?.toFixed(2) || 'N/A'}`);
  console.log(`    Crossover:   ${ti.smaCrossover || 'N/A'}`);
  if (ti.macd) {
    console.log(`    MACD:        ${ti.macd.macd?.toFixed(2)} (Signal: ${ti.macd.signal?.toFixed(2)}, Hist: ${ti.macd.histogram?.toFixed(2)})`);
  }
  if (ti.bollingerBands) {
    console.log(`    Bollinger:   Upper: ₹${ti.bollingerBands.upper?.toFixed(2)} | Mid: ₹${ti.bollingerBands.middle?.toFixed(2)} | Lower: ₹${ti.bollingerBands.lower?.toFixed(2)}`);
  }

  // Support & Resistance
  const sr = report.supportResistance;
  console.log(`\n  Support & Resistance:`);
  console.log(`    Supports:    ${sr.supports.map((s) => '₹' + s.toFixed(2)).join(', ') || 'None detected'}`);
  console.log(`    Resistances: ${sr.resistances.map((s) => '₹' + s.toFixed(2)).join(', ') || 'None detected'}`);

  // Fibonacci
  if (report.fibonacci) {
    const fib = report.fibonacci;
    console.log(`\n  Fibonacci Retracement (${fib.swingLow.toFixed(2)} - ${fib.swingHigh.toFixed(2)}):`);
    console.log(`    23.6%:  ₹${fib.level_236.toFixed(2)}`);
    console.log(`    38.2%:  ₹${fib.level_382.toFixed(2)}`);
    console.log(`    50.0%:  ₹${fib.level_500.toFixed(2)}`);
    console.log(`    61.8%:  ₹${fib.level_618.toFixed(2)}`);
    console.log(`    78.6%:  ₹${fib.level_786.toFixed(2)}`);
    console.log(`    Zone:   ${fib.zone}`);
  }

  // Pivot Points
  if (report.pivotPoints) {
    const pp = report.pivotPoints.standard;
    console.log(`\n  Pivot Points (Standard):`);
    console.log(`    R3: ₹${pp.r3.toFixed(2)} | R2: ₹${pp.r2.toFixed(2)} | R1: ₹${pp.r1.toFixed(2)}`);
    console.log(`    Pivot: ₹${pp.pivot.toFixed(2)}`);
    console.log(`    S1: ₹${pp.s1.toFixed(2)} | S2: ₹${pp.s2.toFixed(2)} | S3: ₹${pp.s3.toFixed(2)}`);
  }

  // Volume
  if (report.volume) {
    const vol = report.volume;
    console.log(`\n  Volume Analysis:`);
    console.log(`    Latest:  ${vol.latestVolume?.toLocaleString() || 'N/A'}`);
    console.log(`    Avg(20): ${vol.avgVolume20?.toLocaleString() || 'N/A'}`);
    console.log(`    Ratio:   ${vol.volumeRatio}x average`);
    console.log(`    Signal:  ${vol.description}`);
  }

  // Trend Strength
  if (report.trendStrength) {
    console.log(`\n  Trend Strength:`);
    console.log(`    ${report.trendStrength.description}`);
  }

  // Score Breakdown
  console.log(`\n  Score Breakdown:`);
  for (const reason of sc.reasons) {
    console.log(`    ${reason}`);
  }

  console.log(`\n${'═'.repeat(60)}`);
}

async function runIntelAll() {
  const portfolioPath = path.resolve(
    process.env.PORTFOLIO_CONFIG || 'config/portfolio.json'
  );
  const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));

  console.log(`\nGenerating intelligence for ${portfolio.holdings.length} stocks...\n`);

  const reports = [];
  for (const holding of portfolio.holdings) {
    process.stdout.write(`  Analyzing ${holding.symbol}...`);
    const history = await getHistoricalData(holding.symbol, 60);
    if (history.length >= 20) {
      const report = generateIntelligenceReport(holding.symbol, history);
      reports.push(report);
      const sc = report.intelligence;
      const color = sc.score >= 20 ? '\x1b[32m' : sc.score <= -20 ? '\x1b[31m' : '\x1b[33m';
      console.log(` ${color}${sc.score > 0 ? '+' : ''}${sc.score} ${sc.recommendation}\x1b[0m`);
    } else {
      console.log(` (insufficient data)`);
    }
  }

  // Sort by score
  reports.sort((a, b) => b.intelligence.score - a.intelligence.score);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  PORTFOLIO INTELLIGENCE SUMMARY');
  console.log(`${'═'.repeat(60)}`);

  const buys = reports.filter((r) => r.intelligence.score >= 10);
  const sells = reports.filter((r) => r.intelligence.score <= -10);
  const holds = reports.filter((r) => Math.abs(r.intelligence.score) < 10);

  if (buys.length > 0) {
    console.log(`\n  \x1b[32mBUY SIGNALS (${buys.length}):\x1b[0m`);
    for (const r of buys) {
      const patterns = r.candlestickPatterns.map((p) => p.name).join(', ') || 'None';
      console.log(`    ${r.symbol.padEnd(14)} Score: +${r.intelligence.score.toString().padStart(3)}  ${r.intelligence.recommendation.padEnd(12)} Patterns: ${patterns}`);
    }
  }

  if (sells.length > 0) {
    console.log(`\n  \x1b[31mSELL SIGNALS (${sells.length}):\x1b[0m`);
    for (const r of sells) {
      const patterns = r.candlestickPatterns.map((p) => p.name).join(', ') || 'None';
      console.log(`    ${r.symbol.padEnd(14)} Score: ${r.intelligence.score.toString().padStart(4)}  ${r.intelligence.recommendation.padEnd(12)} Patterns: ${patterns}`);
    }
  }

  if (holds.length > 0) {
    console.log(`\n  \x1b[33mHOLD (${holds.length}):\x1b[0m`);
    for (const r of holds) {
      console.log(`    ${r.symbol.padEnd(14)} Score: ${(r.intelligence.score > 0 ? '+' : '') + r.intelligence.score.toString().padStart(3)}  ${r.intelligence.recommendation}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Total: ${buys.length} Buy | ${holds.length} Hold | ${sells.length} Sell`);
  console.log(`${'═'.repeat(60)}\n`);
}

async function showPortfolio() {
  const portfolioPath = path.resolve(
    process.env.PORTFOLIO_CONFIG || 'config/portfolio.json'
  );
  const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));

  console.log(`\n${portfolio.name}`);
  console.log('='.repeat(50));

  const symbols = portfolio.holdings.map((h) => h.symbol);
  const quotes = await getMultipleQuotes(symbols);

  let totalValue = 0;
  let totalInvested = 0;

  const rows = portfolio.holdings.map((h) => {
    const quote = quotes.find((q) => q.symbol === h.symbol);
    const price = quote?.currentPrice || h.avgBuyPrice;
    const currentValue = price * h.quantity;
    const investedValue = h.avgBuyPrice * h.quantity;
    const pnl = currentValue - investedValue;
    const pnlPercent = (pnl / investedValue) * 100;

    totalValue += currentValue;
    totalInvested += investedValue;

    return { ...h, price, currentValue, pnl, pnlPercent };
  });

  for (const r of rows) {
    const weight = (r.currentValue / totalValue) * 100;
    console.log(
      `  ${r.symbol.padEnd(12)} ₹${r.price.toFixed(2).padStart(10)} x ${String(r.quantity).padStart(4)}  =  ₹${r.currentValue.toFixed(0).padStart(9)}  (${weight.toFixed(1)}%)  P&L: ${r.pnl >= 0 ? '+' : ''}₹${r.pnl.toFixed(0)} (${r.pnlPercent >= 0 ? '+' : ''}${r.pnlPercent.toFixed(1)}%)`
    );
  }

  const totalPnl = totalValue - totalInvested;
  console.log('─'.repeat(50));
  console.log(`  Total Invested: ₹${totalInvested.toFixed(0)}`);
  console.log(`  Current Value:  ₹${totalValue.toFixed(0)}`);
  console.log(`  Total P&L:      ${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toFixed(0)} (${((totalPnl / totalInvested) * 100).toFixed(1)}%)`);
}

// Route commands
(async () => {
  switch (command) {
    case 'monitor':
      startMonitor();
      break;
    case 'check':
      await runMonitorCycle();
      break;
    case 'quote':
      await showQuote(args[1]);
      break;
    case 'analyze':
      await runAnalysis(args[1]);
      break;
    case 'candles':
      await scanCandlesticks(args[1]);
      break;
    case 'intel':
      await runIntelligence(args[1]);
      break;
    case 'intel-all':
      await runIntelAll();
      break;
    case 'portfolio':
      await showPortfolio();
      break;
    default:
      printUsage();
  }
})();
