const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

function createClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\nScan this QR code with WhatsApp on your phone:');
    console.log('(WhatsApp app > Settings > Linked Devices > Link a Device)\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('WhatsApp authenticated.');
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failed:', msg);
  });

  client.on('disconnected', (reason) => {
    console.error('WhatsApp disconnected:', reason);
  });

  return client;
}

module.exports = { createClient };
