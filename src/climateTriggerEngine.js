/**
 * Flood risk thresholds for street/urban flooding, based on 12h accumulation
 * and peak hourly intensity (standard heuristics: >7.6mm/hr is "heavy rain",
 * sustained totals above ~50mm/12h saturate urban drainage in most cities).
 */
const FLOOD_RISK_LEVELS = [
  { level: 'severe', minTotalMm: 100, minIntensityMm: 15 },
  { level: 'high', minTotalMm: 50, minIntensityMm: 10 },
  { level: 'moderate', minTotalMm: 25, minIntensityMm: 7.6 },
  { level: 'low', minTotalMm: 10, minIntensityMm: 4 },
];

/**
 * Estimate street/urban flooding risk from a rainfall forecast summary.
 * Combines total 12h accumulation, peak hourly intensity, and how many
 * consecutive hours stay wet (saturates drainage) into one risk level.
 */
function assessFloodRisk(summary) {
  for (const tier of FLOOD_RISK_LEVELS) {
    if (summary.totalMm >= tier.minTotalMm || summary.maxHourlyMm >= tier.minIntensityMm) {
      return {
        level: tier.level,
        reason:
          summary.maxHourlyMm >= tier.minIntensityMm
            ? `Peak intensity ${summary.maxHourlyMm}mm/hr can overwhelm street drainage`
            : `Accumulated ${summary.totalMm}mm over the window can saturate drainage`,
      };
    }
  }
  return { level: 'minimal', reason: 'No significant rainfall accumulation or intensity expected' };
}

/**
 * Evaluate rainfall triggers against one or more location forecasts.
 *
 * locationForecasts: [{ name, lat, lon, forecast: { summary, hourly, windowHours } }]
 * triggers: array of trigger configs from config/climateTriggers.json
 */
function evaluateRainfallTriggers(locationForecasts, triggers) {
  const fired = [];

  for (const trigger of triggers) {
    const targets =
      trigger.location === 'ALL'
        ? locationForecasts
        : locationForecasts.filter((l) => l.name === trigger.location);

    for (const loc of targets) {
      const { summary } = loc.forecast;
      const result = evaluateSingleTrigger(trigger, summary);
      if (result.triggered) {
        fired.push({
          location: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          type: trigger.type,
          action: trigger.action,
          message: `${loc.name}: ${trigger.message}`,
          value: result.value,
          summary,
          floodRisk: assessFloodRisk(summary),
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }

  return fired;
}

function evaluateSingleTrigger(trigger, summary) {
  switch (trigger.type) {
    case 'total_exceeds':
      return { triggered: summary.totalMm >= trigger.thresholdMm, value: summary.totalMm };

    case 'total_below':
      return { triggered: summary.totalMm < trigger.thresholdMm, value: summary.totalMm };

    case 'intensity_exceeds':
      return { triggered: summary.maxHourlyMm >= trigger.thresholdMm, value: summary.maxHourlyMm };

    case 'probability_exceeds':
      return {
        triggered: summary.maxProbability >= trigger.thresholdPercent,
        value: summary.maxProbability,
      };

    case 'consecutive_wet_hours':
      return {
        triggered: summary.maxConsecutiveWetHours >= trigger.thresholdHours,
        value: summary.maxConsecutiveWetHours,
      };

    default:
      return { triggered: false, value: null };
  }
}

/**
 * Evaluate flood-risk triggers: fires when a location's assessed flood risk
 * level meets or exceeds the configured minimum level.
 */
function evaluateFloodRiskTriggers(locationForecasts, triggers) {
  const levelOrder = ['minimal', 'low', 'moderate', 'high', 'severe'];
  const fired = [];

  for (const trigger of triggers) {
    const targets =
      trigger.location === 'ALL'
        ? locationForecasts
        : locationForecasts.filter((l) => l.name === trigger.location);

    const minLevelIndex = levelOrder.indexOf(trigger.minLevel);

    for (const loc of targets) {
      const risk = assessFloodRisk(loc.forecast.summary);
      if (levelOrder.indexOf(risk.level) >= minLevelIndex) {
        fired.push({
          location: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          action: trigger.action,
          message: `${loc.name}: ${trigger.message}`,
          floodRisk: risk,
          summary: loc.forecast.summary,
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }

  return fired;
}

module.exports = {
  assessFloodRisk,
  evaluateRainfallTriggers,
  evaluateFloodRiskTriggers,
};
