#!/usr/bin/env node
/**
 * Feed real Reddit threads to the site's scoring and drafting endpoint.
 *
 * The normal discovery script (scripts/reddit-discover.mjs) fetches Reddit's
 * JSON API directly, and Reddit blocks datacenter IPs — which includes this
 * machine. The threads themselves are still perfectly readable through search.
 *
 * So this script takes a file of threads that were found some other way, works
 * out when each one was posted, and hands them to /api/reddit/ingest, which
 * scores the intent, matches an article, drafts a reply and runs the policy
 * checks. The drafts land in the operator's review queue at /admin/reddit.
 *
 * Nothing is posted to Reddit. This script does not write to Reddit, cannot,
 * and does not try to.
 *
 *   node scripts/reddit-ingest-threads.mjs --file threads.json [--dry-run]
 *
 * The file format is:
 *
 *   {
 *     "r/freebooks": [
 *       { "id": "1xgtkev", "title": "...", "selftext": "...", "author": "...",
 *         "permalink": "/r/freebooks/comments/1xgtkev/.../", "score": 12,
 *         "numComments": 8 }
 *     ]
 *   }
 *
 * The creation time is not in the file because search results do not carry
 * it: it is decoded from the Reddit id, which is a base-36 counter offset
 * from a fixed epoch.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** Reddit ids are base-36 numbers counting from this offset, in milliseconds. */
const REDDIT_ID_EPOCH_MS = 1288834974687;

/** The ingest route ignores anything older than this. */
const MAX_AGE_HOURS = 48;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileIndex = args.indexOf('--file');
if (fileIndex === -1) {
  console.error('Usage: node scripts/reddit-ingest-threads.mjs --file <threads.json> [--dry-run]');
  process.exit(1);
}
const file = path.resolve(process.cwd(), args[fileIndex + 1]);

if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

/** Load .env.local without printing any of its values. */
function loadEnv() {
  const envFile = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^"(.*)"$/, '$1');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

/**
 * The creation time of a Reddit post, decoded from its id.
 * Returns null when the id is not a plausible Reddit id.
 */
function createdUtcFromId(id) {
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null;
  const asNumber = Number.parseInt(id, 36);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;
  const ms = asNumber - REDDIT_ID_EPOCH_MS;
  if (ms <= 0) return null;
  return Math.floor(ms / 1000);
}

function loadKey() {
  if (process.env.ANYFREEBOOK_API_KEY) return process.env.ANYFREEBOOK_API_KEY.trim();
  const keyFile = 'D:\\Android\\keys\\reddit-ingest-key.txt';
  if (fs.existsSync(keyFile)) {
    const line = fs.readFileSync(keyFile, 'utf8').split(/\r?\n/).find(l => l.trim());
    if (line) return line.trim();
  }
  return null;
}

async function main() {
  loadEnv();

  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const site = (process.env.SITE_URL || 'https://anyfreebook.com').replace(/\/$/, '');
  const now = Math.floor(Date.now() / 1000);

  const listings = {};
  const skipped = [];
  let fresh = 0;

  for (const [subreddit, threads] of Object.entries(raw)) {
    const name = subreddit.replace(/^\/?r\//i, '');
    const children = [];

    for (const thread of threads) {
      const created = createdUtcFromId(thread.id);
      if (!created) {
        skipped.push(`r/${name} ${thread.id} — the id is not a Reddit id, so its age is unknown`);
        continue;
      }
      const ageHours = (now - created) / 3600;
      if (ageHours > MAX_AGE_HOURS) {
        skipped.push(`r/${name} ${thread.id} — ${Math.round(ageHours)}h old, past the ${MAX_AGE_HOURS}h window`);
        continue;
      }
      if (ageHours < 0) {
        skipped.push(`r/${name} ${thread.id} — its id decodes to a time in the future`);
        continue;
      }
      fresh++;
      children.push({
        kind: 't3',
        data: {
          id: thread.id,
          title: thread.title ?? '',
          selftext: thread.selftext ?? '',
          author: thread.author ?? '[deleted]',
          permalink: thread.permalink ?? `/r/${name}/comments/${thread.id}/`,
          created_utc: created,
          score: thread.score ?? 0,
          num_comments: thread.numComments ?? 0,
          stickied: false,
          over_18: false,
        },
      });
    }

    if (children.length) listings[name] = children;
  }

  console.log(`${fresh} thread(s) inside the ${MAX_AGE_HOURS}h window`);
  if (skipped.length) {
    console.log('\nSkipped:');
    for (const line of skipped) console.log(`  ${line}`);
  }

  if (fresh === 0) {
    console.error('\nNothing fresh. Nothing was sent.');
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log('\nDry run — the following would be sent to /api/reddit/ingest:');
    for (const [subreddit, children] of Object.entries(listings)) {
      for (const child of children) {
        console.log(`  r/${subreddit} — ${child.data.title}`);
      }
    }
    return;
  }

  const apiKey = loadKey();
  if (!apiKey) {
    console.error('\nNo ingest key. Put the partner-tier key labelled "reddit-ingest" in .env.local,');
    console.error('or in D:\\Android\\keys\\reddit-ingest-key.txt.');
    process.exitCode = 1;
    return;
  }

  const res = await fetch(`${site}/api/reddit/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ listings }),
    signal: AbortSignal.timeout(60_000),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`\nThe ingest route refused the threads (HTTP ${res.status}): ${text}`);
    process.exitCode = 1;
    return;
  }

  const result = JSON.parse(text);
  console.log(
    `\nseen ${result.seen} · saved ${result.saved} · drafted ${result.drafted} · not ready ${result.notReady} · posted ${result.posted}`
  );
  for (const draft of result.drafts || []) {
    const problems = draft.problems && draft.problems.length ? ` — ${draft.problems.join('; ')}` : '';
    console.log(`  r/${draft.subreddit} — ${draft.title} (ratio ${draft.ratio})${problems}`);
  }
  console.log('\nReview them at /admin/reddit. Nothing has been posted to Reddit.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
