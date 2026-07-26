require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getMultipleForecasts } = require('./weatherApi');
const { evaluateRainfallTriggers, evaluateFloodRiskTriggers } = require('./climateTriggerEngine');
const { sendAlert, formatRainfallEmail, formatFloodRiskEmail } = require('./emailService');

const locationsPath = path.resolve(
  process.env.CLIMATE_LOCATIONS_CONFIG || 'config/climateLocations.json'
);
const climateTriggersPath = path.resolve(
  process.env.CLIMATE_TRIGGERS_CONFIG || 'config/climateTriggers.json'
);

function loadConfig() {
  const locationsConfig = JSON.parse(fs.readFileSync(locationsPath, 'utf-8'));
  const triggers = JSON.parse(fs.readFileSync(climateTriggersPath, 'utf-8'));
  return { locations: locationsConfig.locations, triggers };
}

// Track which triggers have already fired this window to avoid spam
const firedTriggerKeys = new Set();

function triggerKey(type, location, detail) {
  // Rainfall forecasts shift hour to hour, so re-check every hour rather than once a day
  const hourBucket = new Date().toISOString().slice(0, 13);
  return `${hourBucket}:${type}:${location}:${detail}`;
}

function isAlreadyFired(key) {
  return firedTriggerKeys.has(key);
}

function markFired(key) {
  firedTriggerKeys.add(key);
}

/**
 * Main climate monitoring cycle: fetch 12h rainfall forecasts for all
 * configured locations and evaluate rainfall + flood risk triggers.
 */
async function runClimateMonitorCycle() {
  console.log(`\n[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Running climate monitor cycle...`);

  try {
    const { locations, triggers } = loadConfig();

    console.log(`Fetching 12h rainfall forecasts for ${locations.length} location(s)...`);
    const locationForecasts = await getMultipleForecasts(locations, 12);

    if (locationForecasts.length === 0) {
      console.log('No forecasts received, skipping cycle.');
      return;
    }

    locationForecasts.forEach((l) => {
      const s = l.forecast.summary;
      console.log(`  ${l.name}: ${s.totalMm}mm total, ${s.maxHourlyMm}mm/hr peak, ${s.maxProbability}% max probability`);
    });

    // 1. Rainfall triggers
    const rainfallFired = evaluateRainfallTriggers(locationForecasts, triggers.rainfallTriggers || []);
    const newRainfallFired = rainfallFired.filter((t) => {
      const key = triggerKey('rainfall', t.location, t.type);
      if (isAlreadyFired(key)) return false;
      markFired(key);
      return true;
    });

    if (newRainfallFired.length > 0) {
      console.log(`  ${newRainfallFired.length} rainfall trigger(s) fired!`);
      await sendAlert({
        subject: `Rainfall Alert: ${[...new Set(newRainfallFired.map((t) => t.location))].join(', ')}`,
        body: formatRainfallEmail(newRainfallFired),
      });
    }

    // 2. Flood risk triggers (street/urban flooding)
    const floodFired = evaluateFloodRiskTriggers(locationForecasts, triggers.floodRiskTriggers || []);
    const newFloodFired = floodFired.filter((t) => {
      const key = triggerKey('flood', t.location, t.floodRisk.level);
      if (isAlreadyFired(key)) return false;
      markFired(key);
      return true;
    });

    if (newFloodFired.length > 0) {
      console.log(`  ${newFloodFired.length} flood risk trigger(s) fired!`);
      await sendAlert({
        subject: `Flood Risk Alert: ${[...new Set(newFloodFired.map((t) => t.location))].join(', ')}`,
        body: formatFloodRiskEmail(newFloodFired),
      });
    }

    console.log('Climate cycle complete.');
  } catch (err) {
    console.error('Climate monitor cycle error:', err.message);
  }
}

/**
 * Start the scheduled climate monitor
 */
function startClimateMonitor() {
  const intervalMinutes = parseInt(process.env.CLIMATE_MONITOR_INTERVAL, 10) || 30;

  console.log('===========================================');
  console.log('  Climate Rainfall Trigger Monitor');
  console.log('===========================================');
  console.log(`Interval: Every ${intervalMinutes} minutes`);
  console.log(`Locations: ${locationsPath}`);
  console.log(`Triggers: ${climateTriggersPath}`);
  console.log(`Email: ${process.env.GMAIL_USER || '(not configured)'}`);
  console.log('===========================================\n');

  runClimateMonitorCycle();

  cron.schedule(`*/${intervalMinutes} * * * *`, () => {
    runClimateMonitorCycle();
  });

  console.log('Climate monitor started. Press Ctrl+C to stop.\n');
}

if (require.main === module) {
  startClimateMonitor();
}

module.exports = { runClimateMonitorCycle, startClimateMonitor };
