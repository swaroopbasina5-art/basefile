const { getTargetGroupChats, fetchNewMessagesForGroup } = require('./fetchGroupMessages');
const { summarizeGroups } = require('./summarizer');
const { setLastRunTimestamp } = require('./state');

function formatDateHeader() {
  return new Date().toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function runDigest(client, { silent = false } = {}) {
  const initialLookbackSeconds = Number(process.env.INITIAL_LOOKBACK_HOURS || 24) * 3600;
  const maxMessages = Number(process.env.MAX_MESSAGES_PER_GROUP || 300);

  const groupChats = await getTargetGroupChats(client);
  if (groupChats.length === 0) {
    console.log('No group chats found (check config/groups.json if you set an allowlist).');
    return;
  }

  const results = [];
  for (const chat of groupChats) {
    try {
      const result = await fetchNewMessagesForGroup(chat, { initialLookbackSeconds, maxMessages });
      results.push(result);
    } catch (err) {
      console.error(`Failed to fetch messages for group "${chat.name}":`, err.message);
    }
  }

  const totalNewMessages = results.reduce((sum, r) => sum + r.lines.length, 0);
  if (totalNewMessages === 0) {
    console.log('No new messages since the last digest.');
    if (!silent) {
      await sendToSelf(client, `📋 *Group Digest* - ${formatDateHeader()}\n\nNo new activity in any group since your last digest.`);
    }
    results.forEach((r) => setLastRunTimestamp(r.groupId, r.latestTimestamp));
    return;
  }

  console.log(`Summarizing ${totalNewMessages} new messages across ${results.length} groups...`);

  const summary = await summarizeGroups(results, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  });

  const digestText = `📋 *Group Digest* - ${formatDateHeader()}\n\n${summary}`;
  await sendToSelf(client, digestText);

  results.forEach((r) => setLastRunTimestamp(r.groupId, r.latestTimestamp));
  console.log('Digest sent.');
}

async function sendToSelf(client, text) {
  const selfId = client.info.wid._serialized;
  await client.sendMessage(selfId, text);
}

module.exports = { runDigest };
