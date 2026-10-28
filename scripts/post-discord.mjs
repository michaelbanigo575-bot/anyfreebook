#!/usr/bin/env node
/**
 * Post an announcement to a Discord channel through a webhook.
 *
 * The webhook URL comes from DISCORD_WEBHOOK_URL (environment variable), and
 * the message comes from this file, so the copy and the credentials are never
 * mixed together.
 *
 *   node scripts/post-discord.mjs --dry-run     # print the payload, post nothing
 *   node scripts/post-discord.mjs               # post it
 *   node scripts/post-discord.mjs --message "..."   # post a different message
 *
 * To create the webhook: Discord server → Server Settings → Integrations →
 * Webhooks → New Webhook → Copy Webhook URL. Then set it in Vercel so the
 * daily-distribution cron can use it too:
 *
 *   vercel env add DISCORD_WEBHOOK_URL production
 *
 * Nothing here is a secret and nothing is printed but the message body.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MESSAGE_FILE = path.join(ROOT, 'docs', 'discord', 'announcement.md');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const messageIndex = args.indexOf('--message');
const inline = messageIndex !== -1 ? args[messageIndex + 1] : null;

function loadMessage() {
  if (inline) return inline;
  if (!fs.existsSync(MESSAGE_FILE)) {
    console.error(`No message file at ${MESSAGE_FILE}.`);
    console.error('Pass one with --message "..." or create the file.');
    process.exit(1);
  }
  return fs.readFileSync(MESSAGE_FILE, 'utf8').trim();
}

const message = loadMessage();
const webhook = process.env.DISCORD_WEBHOOK_URL || '';

if (!webhook) {
  console.error('DISCORD_WEBHOOK_URL is not set, so there is nothing to post to.');
  console.error('');
  console.error('The message that would have been posted:');
  console.error('---');
  console.error(message);
  console.error('---');
  process.exit(dryRun ? 0 : 1);
}

if (dryRun) {
  console.log('Dry run — nothing was posted. The payload would be:');
  console.log('---');
  console.log(message);
  console.log('---');
  process.exit(0);
}

// Discord rejects a message body over 2000 characters. Rather than truncate a
// sentence in half, split on blank lines and send the parts in order.
const LIMITS = { content: 2000 };
const parts = [];
let current = '';
for (const paragraph of message.split(/\n{2,}/)) {
  const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
  if (candidate.length > LIMITS.content && current) {
    parts.push(current);
    current = paragraph;
  } else {
    current = candidate;
  }
}
if (current) parts.push(current);

try {
  for (const part of parts) {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: part }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Discord refused the post (HTTP ${response.status}): ${body}`);
      process.exit(1);
    }
  }
  console.log(`Posted ${parts.length} message${parts.length === 1 ? '' : 's'} to Discord.`);
} catch (err) {
  console.error(`Could not reach the Discord webhook: ${err && err.message ? err.message : err}`);
  process.exit(1);
}
