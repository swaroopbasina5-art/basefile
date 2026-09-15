const fs = require('fs');
const path = require('path');

const STATE_PATH = path.resolve(__dirname, '..', '.state.json');

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { lastRunByGroup: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function getLastRunTimestamp(groupId) {
  const state = loadState();
  return state.lastRunByGroup[groupId] || null;
}

function setLastRunTimestamp(groupId, timestampSeconds) {
  const state = loadState();
  state.lastRunByGroup[groupId] = timestampSeconds;
  saveState(state);
}

module.exports = { getLastRunTimestamp, setLastRunTimestamp };
