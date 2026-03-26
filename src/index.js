require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getStockQuote, getMultipleQuotes, getHistoricalData } = require('./growwApi');
const { analyzeStock } = require('./technicalAnalysis');
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
  portfolio     Show current portfolio status
  help          Show this help message

Configuration:
  Edit config/portfolio.json  - Your portfolio holdings & target weights
  Edit config/triggers.json   - Price, % change, and technical triggers
  Copy .env.example to .env   - Gmail credentials and settings

Examples:
  node src/index.js monitor
  node src/index.js quote RELIANCE
  node src/index.js analyze TCS
  node src/index.js portfolio
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
    case 'portfolio':
      await showPortfolio();
      break;
    default:
      printUsage();
  }
})();
