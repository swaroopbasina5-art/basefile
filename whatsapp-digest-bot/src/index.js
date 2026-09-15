require('dotenv').config();
const { createClient } = require('./whatsappClient');
const { startScheduler } = require('./scheduler');
const { runDigest } = require('./digest');

const summarizerProvider = (process.env.SUMMARIZER_PROVIDER || 'ollama').toLowerCase();
if (summarizerProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
  console.error('SUMMARIZER_PROVIDER=anthropic requires ANTHROPIC_API_KEY in .env.');
  process.exit(1);
}

const client = createClient();
const trigger = (process.env.ON_DEMAND_TRIGGER || '/digest').toLowerCase();

client.on('ready', () => {
  console.log('WhatsApp client ready.');
  startScheduler(client);
  console.log(`Send yourself "${trigger}" on WhatsApp any time for an on-demand digest.`);
});

// message_create fires for messages you send too, which is how the
// on-demand trigger (a message you send to yourself) is caught.
client.on('message_create', async (message) => {
  if (!message.fromMe) return;
  if (message.to !== message.from) return; // only react in your own self-chat
  if ((message.body || '').trim().toLowerCase() !== trigger) return;

  console.log('On-demand digest triggered.');
  try {
    await runDigest(client);
  } catch (err) {
    console.error('On-demand digest failed:', err);
  }
});

client.initialize();
