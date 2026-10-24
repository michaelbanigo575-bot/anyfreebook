#!/usr/bin/env node
/**
 * Reddit discovery — run this from YOUR machine, not from the server.
 *
 * Reddit blocks datacenter IP ranges on its JSON endpoints, so a cron on
 * Vercel usually gets a 403. From a home connection it works fine.
 *
 * This script is READ-ONLY against Reddit. It lists new threads, hands them
 * to the site for scoring and drafting, and prints a summary. It never posts,
 * never comments, never votes.
 *
 *   node scripts/reddit-discover.mjs
 *   node scripts/reddit-discover.mjs --subreddit freebooks
 *   node scripts/reddit-discover.mjs --product anyfreebook --dry-run
 *
 * Env:
 *   REDDIT_INGEST_SECRET   shared secret for POST /api/reddit/ingest
 *   SITE_URL               defaults to https://anyfreebook.com
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** The same subreddits the app watches. Kept in sync with src/lib/reddit/targets.ts. */
const TARGETS = [
  'freebooks',
  'reading',
  'educational-tools',
  'SideProject',
  'Nigeria',
  'LocalLLaMA',
  'ContentCreators',
  'ArtificialInteligence',
  'SaaS',
  'FlutterDev',
];

const MAX_SUBREDDITS_PER_DAY = 5;
const MIN_REQUEST_INTERVAL_MS = 60_000;
const USER_AGENT =
  'web:anyfreebook.com:0.1 (read-only community discovery; operator-reviewed replies; contact: anyfreebook.com)';

function parseArgs(argv) {
  const args = { subreddits: [], dryRun: false, product: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--subreddit' || a === '-s') args.subreddits.push(argv[++i]);
    else if (a === '--product' || a === '-p') args.product = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

/** Load .env.local without printing any of its values. */
function loadEnv() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^"(.*)"$/, '$1');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

async function fetchSubreddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25&raw_json=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const hint =
      res.status === 403
        ? ' — Reddit blocked this IP. Run this from your own connection, not from a server.'
        : '';
    throw new Error(`r/${subreddit}: HTTP ${res.status}${hint}`);
  }
  const json = await res.json();
  return json?.data?.children ?? [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Reddit discovery (read-only)

  --subreddit, -s <name>   watch one subreddit (repeatable)
  --product, -p <name>     anyfreebook | afristudio
  --dry-run               list what would be fetched, then stop
  --help, -h              this message

Reads new threads and hands them to ${process.env.SITE_URL || 'https://anyfreebook.com'}/api/reddit/ingest
for scoring and drafting. Nothing is posted to Reddit.
`);
    return;
  }

  const site = (process.env.SITE_URL || 'https://anyfreebook.com').replace(/\/$/, '');
  const secret = process.env.REDDIT_INGEST_SECRET || process.env.CRON_SECRET;

  let subs = args.subreddits.length > 0 ? args.subreddits : TARGETS;
  if (args.product) {
    // The product filter is applied server-side; the script still needs to
    // know which subreddits belong to it, and the list is small enough that
    // keeping it here is clearer than fetching it.
    const map = {
      anyfreebook: ['freebooks', 'reading', 'educational-tools', 'SideProject', 'Nigeria'],
      afristudio: ['LocalLLaMA', 'ContentCreators', 'ArtificialInteligence', 'SaaS', 'FlutterDev'],
    };
    subs = (map[args.product] || []).filter((s) => subs.includes(s));
  }

  // The daily cap. The server counts this too, but stopping early here means
  // we do not even make the requests.
  subs = subs.slice(0, MAX_SUBREDDITS_PER_DAY);

  if (args.dryRun) {
    console.log('Would read these subreddits, newest first:');
    for (const s of subs) console.log(`  r/${s}`);
    console.log(`\n${subs.length} of ${MAX_SUBREDDITS_PER_DAY} allowed for today.`);
    return;
  }

  if (!secret) {
    console.error(
      'REDDIT_INGEST_SECRET is not set. Add it to .env.local (and to the Vercel env vars) so this\n' +
        'script can hand the threads to the site for scoring.'
    );
    process.exitCode = 1;
    return;
  }

  const listings = {};
  const errors = [];

  for (const [index, subreddit] of subs.entries()) {
    if (index > 0) {
      const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequest);
      if (wait > 0) await sleep(wait);
    }
    try {
      const children = await fetchSubreddit(subreddit);
      listings[subreddit] = children;
      console.log(`r/${subreddit}: ${children.length} threads`);
    } catch (err) {
      errors.push(err.message);
      console.error(err.message);
    }
  }

  if (Object.keys(listings).length === 0) {
    console.error('\nNothing was read. Nothing was sent.');
    process.exitCode = 1;
    return;
  }

  console.log('\nHanding the threads to the site for scoring and drafting...');
  const res = await fetch(`${site}/api/reddit/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ingest-secret': secret,
    },
    body: JSON.stringify({ listings }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    console.error(`The site returned ${res.status}: ${await res.text()}`);
    process.exitCode = 1;
    return;
  }

  const result = await res.json();
  console.log(
    `\n${result.seen} high-intent threads, ${result.saved} new, ${result.drafted} drafts ready, ${result.notReady} needing work.`
  );
  console.log('Review them at /admin/reddit. Nothing was posted.');
}

let lastRequest = 0;

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
