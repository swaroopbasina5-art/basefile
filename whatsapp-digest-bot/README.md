# WhatsApp Group Digest Bot

Reads all your WhatsApp groups and sends **you** a single combined summary —
automatically once a day, or on-demand whenever you ask for one. Works with
groups that chat in English, Hindi, or Hinglish.

## How it works (plain-English)

- This runs as a small program that logs into WhatsApp the same way
  **WhatsApp Web** does — by scanning a QR code once with your phone. It does
  not use a separate bot number; it mirrors your own account.
- It needs to stay running all the time to keep that connection alive. You're
  running it on your own Mac, so **your Mac needs to stay on, awake, and
  connected to the internet** for the automatic daily digest to fire (see the
  "Keep your Mac awake" note below). If it's asleep at digest time, no digest
  goes out until it wakes — but on-demand (`/digest`) still works any time
  it's running.
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

1. **Your Mac**, plugged in and staying awake while the bot runs (see below).
2. **An Anthropic API key** — this pays for the AI that writes your
   summaries. Get one at https://console.anthropic.com/ (Settings > API
   Keys). Cost for a daily digest of a handful of groups is typically a few
   cents a month.
3. **Your phone with WhatsApp installed**, to scan a QR code once.

## Setup steps (on your Mac)

Open the **Terminal** app (press `Cmd+Space`, type "Terminal", hit Enter).
Every command below gets typed into that window.

**1. Install Node.js** (one-time). Easiest way is via Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node git
```
(If Homebrew is new to you: paste the first command, press Enter, and follow
any on-screen prompts — it may ask for your Mac password.) If you'd rather
avoid Homebrew, you can instead download the Node.js installer directly from
https://nodejs.org (choose the "LTS" version) and run it like any Mac app.

**2. Get the code onto your Mac:**
```bash
cd ~
git clone https://github.com/swaroopbasina5-art/basefile.git
cd basefile/whatsapp-digest-bot
```
(The first time you run `git`, macOS may prompt you to install "Command
Line Developer Tools" — click Install and wait for it to finish, then
re-run the command above.)

**3. Install dependencies:**
```bash
npm install
```
This also downloads a private copy of Chromium (the browser whatsapp-web.js
drives) automatically — no extra step needed on Mac.

**4. Configure it:**
```bash
cp .env.example .env
open -e .env
```
That opens the file in TextEdit. Paste in your `ANTHROPIC_API_KEY`, save
(`Cmd+S`), and close the window. Leave everything else as default to start
(daily digest at 9 PM IST, trigger word `/digest`).

Optional: only want specific groups summarized instead of all of them?
```bash
cp config/groups.json.example config/groups.json
open -e config/groups.json
```
List the exact group names you want included, save, and close. Delete
`config/groups.json` (or leave it uncreated) to include every group.

**5. Keep it running with pm2** (so it survives closing the Terminal window):
```bash
npm install -g pm2
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

**7. Make it survive a Mac restart:**
```bash
pm2 save
pm2 startup
```
This prints another command tailored to your Mac — copy-paste and run that
one too, it's a one-time setup step (it may ask for your password).

## Keep your Mac awake

Since the bot runs locally, the automatic 9 PM digest only fires if your
Mac is on and awake at that time. Easiest fix — open **System Settings >
Lock Screen**, and set "Turn display off" options so the Mac doesn't fully
sleep (closing the lid still sleeps it, so keep it open and plugged in, or
use an external display). Alternatively, run this once per session to keep
it awake in the background without changing your system settings:
```bash
caffeinate -s &
```
On-demand digests (`/digest`) work fine any time the bot is running — it's
only the scheduled 9 PM one that needs the Mac awake at that exact time.

## Moving to a cloud server later

If you'd rather this run 24/7 without depending on your Mac being on, the
same code works unchanged on a small Linux VPS (e.g. DigitalOcean). Just
ask and I'll give you the equivalent Linux setup steps — the `.env` and
`config/groups.json` you've already set up carry over as-is.

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
