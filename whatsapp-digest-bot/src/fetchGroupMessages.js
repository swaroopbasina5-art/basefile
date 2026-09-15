const fs = require('fs');
const path = require('path');
const { getLastRunTimestamp } = require('./state');

const GROUPS_CONFIG_PATH = path.resolve(__dirname, '..', 'config', 'groups.json');

function loadGroupAllowlist() {
  try {
    const raw = fs.readFileSync(GROUPS_CONFIG_PATH, 'utf-8');
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.length > 0) return list;
    return null;
  } catch (err) {
    return null;
  }
}

async function getTargetGroupChats(client) {
  const chats = await client.getChats();
  const groupChats = chats.filter((chat) => chat.isGroup);

  const allowlist = loadGroupAllowlist();
  if (!allowlist) return groupChats;

  const normalized = allowlist.map((name) => name.trim().toLowerCase());
  return groupChats.filter((chat) => normalized.includes((chat.name || '').trim().toLowerCase()));
}

function describeSender(message) {
  const notifyName = message._data && message._data.notifyName;
  if (notifyName) return notifyName;
  if (message.author) return message.author.split('@')[0];
  return message.fromMe ? 'You' : 'Unknown';
}

function messageToLine(message) {
  const sender = describeSender(message);

  if (message.type !== 'chat' && message.body === '') {
    return `${sender}: [${message.type}]`;
  }
  if (!message.body) return null;

  return `${sender}: ${message.body}`;
}

async function fetchNewMessagesForGroup(chat, { initialLookbackSeconds, maxMessages }) {
  const groupId = chat.id._serialized;
  const lastRun = getLastRunTimestamp(groupId);
  const sinceTimestamp = lastRun || Math.floor(Date.now() / 1000) - initialLookbackSeconds;

  const messages = await chat.fetchMessages({ limit: maxMessages });
  const newMessages = messages.filter((m) => m.timestamp >= sinceTimestamp);

  const lines = newMessages.map(messageToLine).filter(Boolean);
  const latestTimestamp = messages.length > 0
    ? Math.max(...messages.map((m) => m.timestamp))
    : sinceTimestamp;

  return {
    groupId,
    groupName: chat.name,
    lines,
    latestTimestamp,
  };
}

module.exports = { getTargetGroupChats, fetchNewMessagesForGroup };
