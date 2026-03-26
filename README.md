# Market Portfolio Triggers

Automated market-based triggers for your Groww portfolio with Gmail notifications.

## Features

- **Price Triggers** - Alert when stocks cross above/below target prices
- **% Change Alerts** - Notify on significant daily/weekly price movements
- **Technical Indicators** - RSI, SMA crossovers, MACD, Bollinger Bands
- **Rebalance Suggestions** - Detect portfolio weight drift and suggest corrections
- **Buy/Sell Signals** - Generate actionable signals based on market conditions
- **Gmail Notifications** - All alerts sent to your linked email

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Gmail credentials
# Edit config/portfolio.json with your holdings
# Edit config/triggers.json with your trigger rules
```

### Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Generate an app password for "Mail"
3. Add it to `.env` as `GMAIL_APP_PASSWORD`

## Usage

```bash
# Start continuous monitoring
npm start monitor

# Run a single check
npm start check

# Get live stock quote
npm start quote RELIANCE

# Run technical analysis
npm start analyze TCS

# View portfolio status
npm start portfolio
```

## Configuration

### Portfolio (`config/portfolio.json`)
Define your holdings with symbols, quantities, buy prices, and target weights.

### Triggers (`config/triggers.json`)
Configure price thresholds, percentage change alerts, technical indicator triggers, and rebalance rules.

## Architecture

```
src/
├── index.js              # CLI entry point
├── monitor.js            # Scheduled monitoring daemon
├── growwApi.js           # Groww API integration
├── triggerEngine.js      # Trigger evaluation logic
├── technicalAnalysis.js  # RSI, SMA, MACD, Bollinger Bands
└── emailService.js       # Gmail notification service
```
