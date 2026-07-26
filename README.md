# Market Portfolio Triggers

Automated market-based triggers for your Groww portfolio, plus a rainfall/flood
climate trigger system, with Gmail notifications.

## Features

### Portfolio
- **Price Triggers** - Alert when stocks cross above/below target prices
- **% Change Alerts** - Notify on significant daily/weekly price movements
- **Technical Indicators** - RSI, SMA crossovers, MACD, Bollinger Bands
- **Rebalance Suggestions** - Detect portfolio weight drift and suggest corrections
- **Buy/Sell Signals** - Generate actionable signals based on market conditions

### Climate / Rainfall
- **12h Rainfall Forecast** - Fetch hourly rainfall for any lat/long via Open-Meteo (no API key)
- **Rainfall Triggers** - Alert on total accumulation, peak intensity, rain probability, or prolonged rain
- **Street Flood Risk** - Combines 12h accumulation + peak hourly intensity into a flood risk level (minimal → severe)
- **Multi-Location Monitoring** - Configure any set of lat/long locations (e.g. delivery routes, warehouses)

All alerts sent as Gmail notifications.

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

# Show 12h rainfall forecast & flood risk for a lat/long
npm start rainfall 26.1509 91.8056

# Start continuous rainfall/flood-risk monitoring for all configured locations
npm run climate-monitor

# Run a single rainfall/flood-risk check cycle
npm start climate-check
```

## Configuration

### Portfolio (`config/portfolio.json`)
Define your holdings with symbols, quantities, buy prices, and target weights.

### Triggers (`config/triggers.json`)
Configure price thresholds, percentage change alerts, technical indicator triggers, and rebalance rules.

### Climate Locations (`config/climateLocations.json`)
Lat/long locations to monitor for rainfall, e.g. warehouse delivery-route areas. Each entry needs
at minimum `name`, `lat`, `lon` (extra fields like `pincode`/`distanceKm` pass through unused).

### Climate Triggers (`config/climateTriggers.json`)
- `rainfallTriggers` - `total_exceeds` / `total_below` (mm over the 12h window), `intensity_exceeds`
  (mm/hr peak), `probability_exceeds` (% chance), `consecutive_wet_hours`
- `floodRiskTriggers` - fires when a location's assessed flood risk (`minimal`/`low`/`moderate`/
  `high`/`severe`, from accumulation + peak intensity) meets or exceeds `minLevel`

## Architecture

```
src/
├── index.js              # CLI entry point
├── monitor.js            # Scheduled portfolio monitoring daemon
├── growwApi.js           # Groww API integration
├── triggerEngine.js      # Portfolio trigger evaluation logic
├── technicalAnalysis.js  # RSI, SMA, MACD, Bollinger Bands
├── weatherApi.js          # Open-Meteo rainfall forecast integration
├── climateTriggerEngine.js# Rainfall & flood-risk trigger evaluation logic
├── climateMonitor.js      # Scheduled rainfall/flood-risk monitoring daemon
└── emailService.js       # Gmail notification service
```
