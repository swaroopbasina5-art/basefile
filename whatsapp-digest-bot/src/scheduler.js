const cron = require('node-cron');
const { runDigest } = require('./digest');

function startScheduler(client) {
  const expression = process.env.DIGEST_CRON || '0 21 * * *';
  const timezone = process.env.DIGEST_TIMEZONE || 'Asia/Kolkata';

  cron.schedule(
    expression,
    async () => {
      console.log('Running scheduled digest...');
      try {
        await runDigest(client);
      } catch (err) {
        console.error('Scheduled digest failed:', err);
      }
    },
    { timezone }
  );

  console.log(`Daily digest scheduled: "${expression}" (${timezone}).`);
}

module.exports = { startScheduler };
