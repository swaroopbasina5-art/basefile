require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getMultipleQuotes, getHistoricalData } = require('./growwApi');
const {
  evaluatePriceTriggers,
  evaluatePercentChangeTriggers,
  evaluateTechnicalTriggers,
  evaluateRebalanceTrigger,
} = require('./triggerEngine');
const {
  sendAlert,
  formatPriceTriggerEmail,
  formatPercentChangeEmail,
  formatTechnicalEmail,
  formatRebalanceEmail,
  formatIntelligenceEmail,
} = require('./emailService');
const { generateIntelligenceReport } = require('./marketIntelligence');

const portfolioPath = path.resolve(
  process.env.PORTFOLIO_CONFIG || 'config/portfolio.json'
);
const triggersPath = path.resolve(
  process.env.TRIGGERS_CONFIG || 'config/triggers.json'
);

function loadConfig() {
  const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));
  const triggers = JSON.parse(fs.readFileSync(triggersPath, 'utf-8'));
  return { portfolio, triggers };
}

// Track which triggers have already fired to avoid spam
const firedTriggerKeys = new Set();

function triggerKey(type, symbol, detail) {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}:${type}:${symbol}:${detail}`;
}

function isAlreadyFired(key) {
  return firedTriggerKeys.has(key);
}

function markFired(key) {
  firedTriggerKeys.add(key);
}

/**
 * Main monitoring cycle
 */
async function runMonitorCycle() {
  console.log(`\n[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Running monitor cycle...`);

  try {
    const { portfolio, triggers } = loadConfig();
    const symbols = portfolio.holdings.map((h) => h.symbol);

    // Fetch live quotes
    console.log('Fetching live quotes...');
    const quotes = await getMultipleQuotes(symbols);
    if (quotes.length === 0) {
      console.log('No quotes received, skipping cycle.');
      return;
    }

    console.log(`Received ${quotes.length} quotes:`);
    quotes.forEach((q) =>
      console.log(`  ${q.symbol}: ₹${q.currentPrice?.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent?.toFixed(2)}%)`)
    );

    // 1. Price triggers
    const priceFired = evaluatePriceTriggers(quotes, triggers.priceTriggers || []);
    const newPriceFired = priceFired.filter((t) => {
      const key = triggerKey('price', t.symbol, t.type + t.triggerPrice);
      if (isAlreadyFired(key)) return false;
      markFired(key);
      return true;
    });

    if (newPriceFired.length > 0) {
      console.log(`  ${newPriceFired.length} price trigger(s) fired!`);
      await sendAlert({
        subject: `Price Alert: ${newPriceFired.map((t) => t.symbol).join(', ')}`,
        body: formatPriceTriggerEmail(newPriceFired),
      });
    }

    // 2. Percent change triggers
    const percentFired = evaluatePercentChangeTriggers(quotes, triggers.percentChangeTriggers || []);
    const newPercentFired = percentFired.filter((t) => {
      const key = triggerKey('percent', t.symbol, t.changePercent?.toFixed(0));
      if (isAlreadyFired(key)) return false;
      markFired(key);
      return true;
    });

    if (newPercentFired.length > 0) {
      console.log(`  ${newPercentFired.length} percent change trigger(s) fired!`);
      await sendAlert({
        subject: `Movement Alert: ${newPercentFired.map((t) => t.symbol).join(', ')}`,
        body: formatPercentChangeEmail(newPercentFired),
      });
    }

    // 3. Technical triggers (fetch historical data)
    console.log('Fetching historical data for technical analysis...');
    const historicalDataMap = {};
    for (const symbol of symbols) {
      historicalDataMap[symbol] = await getHistoricalData(symbol, 60);
    }

    const technicalFired = evaluateTechnicalTriggers(
      historicalDataMap,
      triggers.technicalTriggers || []
    );
    const newTechnicalFired = technicalFired.filter((t) => {
      const key = triggerKey('technical', t.symbol, t.indicator);
      if (isAlreadyFired(key)) return false;
      markFired(key);
      return true;
    });

    if (newTechnicalFired.length > 0) {
      console.log(`  ${newTechnicalFired.length} technical trigger(s) fired!`);
      await sendAlert({
        subject: `Technical Alert: ${newTechnicalFired.map((t) => t.symbol).join(', ')}`,
        body: formatTechnicalEmail(newTechnicalFired),
      });
    }

    // 4. Rebalance check
    if (triggers.rebalanceTrigger) {
      const rebalanceSuggestions = evaluateRebalanceTrigger(
        quotes,
        portfolio.holdings,
        triggers.rebalanceTrigger
      );

      if (rebalanceSuggestions.length > 0) {
        const key = triggerKey('rebalance', 'portfolio', 'drift');
        if (!isAlreadyFired(key)) {
          markFired(key);
          console.log('  Portfolio rebalance needed!');
          await sendAlert({
            subject: 'Portfolio Rebalance Suggested',
            body: formatRebalanceEmail(rebalanceSuggestions),
          });
        }
      }
    }

    // 5. Market Intelligence Report (runs once daily at first cycle)
    const intelKey = triggerKey('intelligence', 'portfolio', 'daily');
    if (!isAlreadyFired(intelKey)) {
      markFired(intelKey);
      console.log('Generating market intelligence reports...');
      const intelReports = [];
      for (const symbol of symbols) {
        const history = historicalDataMap[symbol];
        if (history && history.length >= 20) {
          intelReports.push(generateIntelligenceReport(symbol, history));
        }
      }

      if (intelReports.length > 0) {
        const actionable = intelReports.filter(
          (r) => r.intelligence && Math.abs(r.intelligence.score) >= 15
        );

        if (actionable.length > 0) {
          console.log(`  ${actionable.length} stocks with actionable intelligence signals`);
          await sendAlert({
            subject: `Daily Intelligence: ${actionable.length} actionable signals`,
            body: formatIntelligenceEmail(actionable),
          });
        }
      }
    }

    console.log('Cycle complete.');
  } catch (err) {
    console.error('Monitor cycle error:', err.message);
  }
}

/**
 * Start the scheduled monitor
 */
function startMonitor() {
  const intervalMinutes = parseInt(process.env.MONITOR_INTERVAL, 10) || 5;

  console.log('===========================================');
  console.log('  Market Portfolio Trigger Monitor');
  console.log('===========================================');
  console.log(`Interval: Every ${intervalMinutes} minutes`);
  console.log(`Portfolio: ${portfolioPath}`);
  console.log(`Triggers: ${triggersPath}`);
  console.log(`Email: ${process.env.GMAIL_USER || '(not configured)'}`);
  console.log('===========================================\n');

  // Run immediately on start
  runMonitorCycle();

  // Then schedule recurring runs (triggers every N minutes)
  cron.schedule(`*/${intervalMinutes} * * * *`, () => {
    runMonitorCycle();
  });

  // Daily full intelligence report at 10:00 AM IST
  const { generateDailyReport } = require('./dailyIntelReport');
  cron.schedule('0 10 * * *', () => {
    console.log('\n[DAILY] Running 10 AM intelligence report...');
    generateDailyReport();
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('Monitor started. Press Ctrl+C to stop.');
  console.log('Daily intelligence report scheduled at 10:00 AM IST.\n');
}

// Allow running directly or importing
if (require.main === module) {
  startMonitor();
}

module.exports = { runMonitorCycle, startMonitor };
