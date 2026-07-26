const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

let authClient = null;

async function getAuthClient() {
  if (authClient) return authClient;

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (!keyFile) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_FILE is not set in .env');
  }

  const auth = new GoogleAuth({ keyFile: path.resolve(keyFile), scopes: SCOPES });
  authClient = await auth.getClient();
  return authClient;
}

async function getSpreadsheetMeta(spreadsheetId) {
  const client = await getAuthClient();
  const res = await client.request({ url: `${SHEETS_API_BASE}/${spreadsheetId}` });
  return res.data;
}

/**
 * Create the sheet tab if it doesn't already exist
 */
async function ensureSheetTab(spreadsheetId, sheetName) {
  const client = await getAuthClient();
  const meta = await getSpreadsheetMeta(spreadsheetId);
  const exists = meta.sheets.some((s) => s.properties.title === sheetName);
  if (exists) return;

  await client.request({
    url: `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`,
    method: 'POST',
    data: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });
}

async function writeRows(spreadsheetId, sheetName, rows) {
  const client = await getAuthClient();

  // Clear first so a shrinking location list doesn't leave stale trailing rows
  await client.request({
    url: `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`,
    method: 'POST',
    data: {},
  });

  await client.request({
    url: `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A1`)}?valueInputOption=RAW`,
    method: 'PUT',
    data: { values: rows },
  });
}

/**
 * Push the climate locations list to a Google Sheet tab, creating the tab if needed.
 */
async function syncLocationsToSheet(locations, { spreadsheetId, sheetName }) {
  await ensureSheetTab(spreadsheetId, sheetName);

  const header = ['Name', 'Pincode', 'Distance (km)', 'Latitude', 'Longitude'];
  const rows = [
    header,
    ...locations.map((l) => [l.name, l.pincode || '', l.distanceKm ?? '', l.lat, l.lon]),
  ];

  await writeRows(spreadsheetId, sheetName, rows);
  return rows.length - 1;
}

module.exports = { syncLocationsToSheet };
