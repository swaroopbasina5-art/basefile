#!/usr/bin/env node

/**
 * Daily Intelligence Report - Scheduled at 10:00 AM IST
 *
 * Generates full market intelligence for all portfolio holdings
 * and sends it via Gmail draft (using Gmail MCP) or SMTP (using nodemailer).
 *
 * Usage:
 *   node src/dailyIntelReport.js          # Run once now
 *   node src/dailyIntelReport.js --cron   # Start cron (10 AM IST daily)
 */

require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getHistoricalData } = require('./growwApi');
const { generateIntelligenceReport } = require('./marketIntelligence');
const { sendAlert, formatIntelligenceEmail } = require('./emailService');

const portfolioPath = path.resolve(
  process.env.PORTFOLIO_CONFIG || 'config/portfolio.json'
);

async function generateDailyReport() {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n[${now}] Generating Daily Intelligence Report...`);

  try {
    const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));
    const holdings = portfolio.holdings;

    console.log(`Analyzing ${holdings.length} stocks...\n`);

    const reports = [];
    for (const holding of holdings) {
      process.stdout.write(`  ${holding.symbol}...`);
      try {
        const history = await getHistoricalData(holding.symbol, 60);
        if (history && history.length >= 20) {
          const report = generateIntelligenceReport(holding.symbol, history);
          reports.push({
            ...report,
            holdingName: holding.name,
            avgBuyPrice: holding.avgBuyPrice,
            quantity: holding.quantity,
            category: holding.category,
          });
          const sc = report.intelligence;
          console.log(` ${sc.score > 0 ? '+' : ''}${sc.score} ${sc.recommendation}`);
        } else {
          console.log(' (insufficient data)');
        }
      } catch (err) {
        console.log(` (error: ${err.message})`);
      }
    }

    if (reports.length === 0) {
      console.log('No reports generated. Skipping email.');
      return;
    }

    // Sort by score
    reports.sort((a, b) => b.intelligence.score - a.intelligence.score);

    const buys = reports.filter((r) => r.intelligence.score >= 10);
    const sells = reports.filter((r) => r.intelligence.score <= -10);
    const holds = reports.filter((r) => Math.abs(r.intelligence.score) < 10);

    // Console summary
    console.log(`\n${'═'.repeat(50)}`);
    console.log('  DAILY INTELLIGENCE SUMMARY');
    console.log(`${'═'.repeat(50)}`);
    console.log(`  Buy: ${buys.length} | Hold: ${holds.length} | Sell: ${sells.length}`);

    if (buys.length > 0) {
      console.log(`\n  BUY signals:`);
      buys.forEach((r) => console.log(`    ${r.symbol.padEnd(14)} +${r.intelligence.score}`));
    }
    if (sells.length > 0) {
      console.log(`\n  SELL signals:`);
      sells.forEach((r) => console.log(`    ${r.symbol.padEnd(14)} ${r.intelligence.score}`));
    }

    // Send email
    const today = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const actionable = reports.filter(
      (r) => r.intelligence && Math.abs(r.intelligence.score) >= 10
    );
    const emailReports = actionable.length > 0 ? actionable : reports.slice(0, 10);

    try {
      await sendAlert({
        subject: `Daily Intelligence Report - ${today} | ${buys.length} Buy, ${sells.length} Sell signals`,
        body: formatIntelligenceEmail(emailReports),
      });
      console.log(`\n  Email sent to ${process.env.GMAIL_USER}`);
    } catch (emailErr) {
      console.error(`\n  Email failed: ${emailErr.message}`);
      console.log('  (Set up GMAIL_APP_PASSWORD in .env to enable email sending)');

      // Save report to file as fallback
      const reportPath = path.resolve(`reports/intel-${new Date().toISOString().slice(0, 10)}.html`);
      const reportsDir = path.dirname(reportPath);
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(reportPath, formatIntelligenceEmail(emailReports));
      console.log(`  Report saved to ${reportPath}`);
    }

    console.log(`\n${'═'.repeat(50)}\n`);
  } catch (err) {
    console.error('Daily report error:', err.message);
  }
}

// --- Entry point ---
const mode = process.argv[2];

if (mode === '--cron') {
  // 10:00 AM IST = 4:30 AM UTC
  console.log('===========================================');
  console.log('  Daily Intelligence Report Scheduler');
  console.log('===========================================');
  console.log('  Schedule: Every day at 10:00 AM IST');
  console.log(`  Portfolio: ${portfolioPath}`);
  console.log(`  Email: ${process.env.GMAIL_USER || '(not configured)'}`);
  console.log('===========================================\n');

  cron.schedule('30 4 * * *', () => {
    generateDailyReport();
  }, {
    timezone: 'Asia/Kolkata',
  });

  // Also use node-cron's timezone support directly
  cron.schedule('0 10 * * *', () => {
    generateDailyReport();
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('Scheduler running. Daily report at 10:00 AM IST. Press Ctrl+C to stop.\n');
} else {
  // Run once immediately
  generateDailyReport();
}

module.exports = { generateDailyReport };
