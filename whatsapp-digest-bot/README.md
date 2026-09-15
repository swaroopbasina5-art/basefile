# WhatsApp Group Digest Bot

Reads all your WhatsApp groups and sends **you** a single combined summary —
automatically once a day, or on-demand whenever you ask for one. Works with
groups that chat in English, Hindi, or Hinglish.

## How it works (plain-English)

- This runs as a small program that logs into WhatsApp the same way
  **WhatsApp Web** does — by scanning a QR code once with your phone. It does
  not use a separate bot number; it mirrors your own account.
- It needs to stay running all the time to keep that connection alive, so it
  lives on a small always-on cloud server (a "VPS"), not your laptop.
- Every night (9 PM by default) it reads what's new in each of your groups,
  asks Claude (Anthropic's AI) to write a short summary of each one, and
  sends you a single WhatsApp message — to yourself — with all of them
  combined.
- You can also get a summary right now: just send yourself the message
  `/digest` on WhatsApp (message your own chat, the same as WhatsApp's
  "Message Yourself" feature) and it replies within a few seconds.

**Important caveat:** this uses the same unofficial method almost every
personal WhatsApp bot uses (there's no official way to read groups you're
just a member of). It's widely used and safe for light personal use, but
it's against WhatsApp's official terms, so avoid extremely heavy usage and
don't be surprised if you occasionally need to re-scan the QR code.

## What you need before you start

1. **A small cloud server (VPS).** Recommended: [DigitalOcean](https://www.digitalocean.com/)
   or [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/). A
   $4-6/month "Ubuntu 22.04" droplet is plenty. (If you'd like, I can walk
   you through creating one.)
2. **An Anthropic API key** — this pays for the AI that writes your
   summaries. Get one at https://console.anthropic.com/ (Settings > API
   Keys). Cost for a daily digest of a handful of groups is typically a few
   cents a month.
3. **Your phone with WhatsApp installed**, to scan a QR code once.

## Setup steps

Do these by SSH-ing into your VPS (your provider's dashboard has a "Console"
or gives you an IP address + password/key to connect with).

**1. Install Node.js** (one-time, on a fresh Ubuntu server):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

**2. Get the code onto the server:**
```bash
git clone https://github.com/swaroopbasina5-art/basefile.git
cd basefile/whatsapp-digest-bot
```

**3. Install dependencies:**
```bash
npm install
```
whatsapp-web.js also needs a browser (Chromium) to run — if `npm install`
doesn't pull it in automatically, run:
```bash
sudo apt-get install -y chromium-browser
```

**4. Configure it:**
```bash
cp .env.example .env
nano .env
```
Paste in your `ANTHROPIC_API_KEY`. Leave everything else as default to
start (daily digest at 9 PM IST, trigger word `/digest`). Save with
`Ctrl+O`, `Enter`, then exit with `Ctrl+X`.

Optional: only want specific groups summarized instead of all of them?
```bash
cp config/groups.json.example config/groups.json
nano config/groups.json
```
List the exact group names you want included. Delete `config/groups.json`
(or leave it uncreated) to include every group.

**5. Keep it running permanently with pm2:**
```bash
sudo npm install -g pm2
pm2 start src/index.js --name whatsapp-digest
```

**6. Scan the QR code (one-time):**
```bash
pm2 logs whatsapp-digest
```
A QR code will appear in the terminal. On your phone: **WhatsApp > Settings
> Linked Devices > Link a Device**, then scan it. Once you see
`WhatsApp client ready.` in the logs, press `Ctrl+C` to stop watching the
logs (the bot keeps running in the background).

**7. Make it survive server reboots:**
```bash
pm2 save
pm2 startup
```
(This last command prints another command — copy-paste and run that one
too, it's a one-time setup step.)

## Try it

Open WhatsApp, go to your own chat with yourself (or just send yourself a
message), and type:
```
/digest
```
Within a few seconds you should get a combined summary of everything new
across your groups. From then on, it'll also run automatically every day
at the time set in `.env`.

## Adjusting things later

- **Change the daily time:** edit `DIGEST_CRON` in `.env` (cron format,
  e.g. `0 8 * * *` = 8 AM), then `pm2 restart whatsapp-digest`.
- **Change the trigger word:** edit `ON_DEMAND_TRIGGER` in `.env`.
- **Better quality summaries:** change `ANTHROPIC_MODEL` in `.env` to a
  Sonnet model instead of Haiku (higher quality, a bit more expensive).
- **Check it's alive:** `pm2 logs whatsapp-digest`
- **If it stops responding:** WhatsApp sessions occasionally need
  re-linking — run `pm2 restart whatsapp-digest` then `pm2 logs
  whatsapp-digest` and re-scan the QR code if one appears.

## Privacy note

Message text is sent to Anthropic's API to generate summaries, and nothing
else. No message content is stored anywhere except a small local file
(`.state.json`) tracking when each group was last summarized — no chat
history is saved to disk.
