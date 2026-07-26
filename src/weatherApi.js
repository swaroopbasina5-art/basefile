const axios = require('axios');

const BASE_URL = process.env.WEATHER_BASE_URL || 'https://api.open-meteo.com/v1/forecast';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
});

/**
 * Fetch hourly rainfall forecast for the next N hours at a given lat/lon.
 * Uses Open-Meteo (no API key required).
 */
async function getRainfallForecast(lat, lon, hours = 12) {
  const res = await client.get('', {
    params: {
      latitude: lat,
      longitude: lon,
      hourly: 'precipitation,precipitation_probability,rain,showers',
      forecast_days: 2,
      timezone: 'auto',
    },
  });

  const hourly = res.data?.hourly;
  if (!hourly || !hourly.time) {
    throw new Error('No hourly forecast data returned');
  }

  const now = new Date();
  let startIndex = hourly.time.findIndex((t) => new Date(t) >= now);
  if (startIndex === -1) startIndex = 0;

  const endIndex = Math.min(startIndex + hours, hourly.time.length);

  const window = [];
  for (let i = startIndex; i < endIndex; i++) {
    window.push({
      time: hourly.time[i],
      precipitationMm: hourly.precipitation?.[i] ?? 0,
      precipitationProbability: hourly.precipitation_probability?.[i] ?? 0,
      rainMm: hourly.rain?.[i] ?? 0,
      showersMm: hourly.showers?.[i] ?? 0,
    });
  }

  return {
    lat,
    lon,
    timezone: res.data.timezone,
    windowHours: window.length,
    hourly: window,
    summary: summarizeForecast(window),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Summarize an hourly rainfall window into aggregate stats used by the trigger engine.
 */
function summarizeForecast(hourly) {
  if (hourly.length === 0) {
    return {
      totalMm: 0,
      maxHourlyMm: 0,
      maxProbability: 0,
      wetHours: 0,
      maxConsecutiveWetHours: 0,
    };
  }

  const totalMm = hourly.reduce((sum, h) => sum + h.precipitationMm, 0);
  const maxHourlyMm = Math.max(...hourly.map((h) => h.precipitationMm));
  const maxProbability = Math.max(...hourly.map((h) => h.precipitationProbability));
  const wetHours = hourly.filter((h) => h.precipitationMm > 0).length;

  let maxConsecutiveWetHours = 0;
  let current = 0;
  for (const h of hourly) {
    if (h.precipitationMm > 0) {
      current++;
      maxConsecutiveWetHours = Math.max(maxConsecutiveWetHours, current);
    } else {
      current = 0;
    }
  }

  return {
    totalMm: Math.round(totalMm * 10) / 10,
    maxHourlyMm: Math.round(maxHourlyMm * 10) / 10,
    maxProbability,
    wetHours,
    maxConsecutiveWetHours,
  };
}

/**
 * Fetch forecasts for multiple named locations in parallel.
 */
async function getMultipleForecasts(locations, hours = 12) {
  const results = await Promise.allSettled(
    locations.map(async (loc) => ({
      ...loc,
      forecast: await getRainfallForecast(loc.lat, loc.lon, hours),
    }))
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
}

module.exports = {
  getRainfallForecast,
  getMultipleForecasts,
  summarizeForecast,
};
