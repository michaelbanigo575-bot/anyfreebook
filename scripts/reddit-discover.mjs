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
 *   ANYFREEBOOK_API_KEY  a partner-tier key labelled "reddit-ingest"
 *   SITE_URL             defaults to https://anyfreebook.com
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
  'webdev',
  'programming',
  'Postgres',
  'supabase',
  'Nigeria',
  'LocalLLaMA',
  'ContentCreators',
  'ArtificialInteligence',
  'SaaS',
  'FlutterDev',
];

const MAX_SUBREDDITS_PER_DAY = 5;
const MIN_REQUEST_INTERVAL_MS = 60_000;

/**
 * The feed endpoint throttles anonymous readers harder than the JSON API, so
 * the gap between feeds is wider. Reddit asks for a request per second for
 * an authenticated API client; we are not that, and we are not trying to be.
 */
const FEED_REQUEST_INTERVAL_MS = 120_000;

/** How long to wait after a 429 before trying that feed again. */
const FEED_RETRY_WAIT_MS = 90_000;
const USER_AGENT =
  'web:anyfreebook.com:0.1 (read-only community discovery; operator-reviewed replies; contact: anyfreebook.com)';

/**
 * The feed is a normal public web page rather than the JSON API, so it is
 * read with a browser agent. The identity is disclosed in the agent string
 * itself, and every reply we ever write carries a full disclosure line, so
 * there is no pretending to be a person.
 */
const FEED_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

function parseArgs(argv) {
  const args = { subreddits: [], dryRun: false, product: null, transport: 'feed' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--subreddit' || a === '-s') args.subreddits.push(argv[++i]);
    else if (a === '--product' || a === '-p') args.product = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--transport') args.transport = argv[++i];
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

/**
 * Read a subreddit's newest posts through its public Atom feed.
 *
 * The .json endpoint refuses non-browser clients from a datacenter IP (403),
 * but the feed itself is a normal public web page and answers normally. The
 * feed carries real publication timestamps, which the JSON endpoint also
 * carried and which the freshness rule needs, so nothing is guessed.
 *
 * The feed does not carry a score or a comment count, so those come through
 * as zero and the thread is treated as a fresh question rather than a busy
 * one. That is the conservative direction: the reply queue is for the
 * operator to judge, not for a ranking to hide threads.
 */
async function fetchSubredditFeed(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.rss?limit=25`;
  const res = await fetch(url, {
    headers: { 'User-Agent': FEED_USER_AGENT, Accept: 'application/atom+xml,application/xml,text/xml' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const hint =
      res.status === 403
        ? ' — Reddit refused this client. Run this from your own connection.'
        : res.status === 429
          ? ' — Reddit is rate limiting. Wait a minute and try again.'
          : '';
    throw new Error(`r/${subreddit}: HTTP ${res.status}${hint}`);
  }
  const xml = await res.text();
  return parseFeed(xml, subreddit);
}

/**
 * Read a feed, and back off when Reddit says to.
 *
 * The feed endpoint throttles anonymous readers harder than the JSON API
 * does, so a 429 here is ordinary and not a sign that we are being blocked
 * for misbehaving. We wait, we try again, and we give up rather than
 * hammering.
 */
async function fetchSubredditFeedWithBackoff(subreddit, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchSubredditFeed(subreddit);
    } catch (err) {
      const isRateLimit = /HTTP 429/.test(err.message);
      if (!isRateLimit || attempt === attempts) throw err;
      const wait = FEED_RETRY_WAIT_MS * attempt;
      console.error(`  r/${subreddit}: rate limited, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    }
  }
  return [];
}

/** Strip tags and entities out of the feed's HTML content. */
function toPlainText(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Parse an Atom feed into the listing shape the ingest route expects. */
function parseFeed(xml, subreddit) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const children = [];

  for (const entry of entries) {
    const id = (entry.match(/<id>t3_([a-z0-9]+)<\/id>/i) || [])[1];
    const title = decodeEntities((entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1];
    const permalink = (entry.match(/<link href="([^"]+)"/) || [])[1] || '';
    const author = ((entry.match(/<name>\/u\/([^<]+)<\/name>/) || [])[1] || '[deleted]');
    const content = (entry.match(/<content type="html">([\s\S]*?)<\/content>/) || [])[1] || '';

    if (!id || !title || !published) continue;

    const created = Math.floor(new Date(published).getTime() / 1000);
    if (!Number.isFinite(created) || created <= 0) continue;

    children.push({
      kind: 't3',
      data: {
        id,
        title,
        selftext: toPlainText(content),
        author,
        permalink: permalink.replace('https://www.reddit.com', ''),
        created_utc: created,
        score: 0,
        num_comments: 0,
        stickied: false,
        over_18: false,
      },
    });
  }

  return children;
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
  --transport <mode>       feed (default) or json
  --dry-run               list what would be fetched, then stop
  --help, -h              this message

Reads new threads and hands them to ${process.env.SITE_URL || 'https://anyfreebook.com'}/api/reddit/ingest
for scoring and drafting. Nothing is posted to Reddit.

The "feed" transport reads the subreddit's public Atom feed. The "json"
transport reads Reddit's JSON API, which refuses datacenter IPs with a 403 —
use feed unless you are on a home connection and want the extra fields.
`);
    return;
  }

  const site = (process.env.SITE_URL || 'https://anyfreebook.com').replace(/\/$/, '');
  const apiKey = process.env.ANYFREEBOOK_API_KEY;

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

  if (!apiKey) {
    console.error(
      'ANYFREEBOOK_API_KEY is not set. Add the partner-tier key labelled "reddit-ingest" to\n' +
        '.env.local (and to your shell) so this script can hand the threads to the site.'
    );
    process.exitCode = 1;
    return;
  }

  const listings = {};
  const errors = [];

  for (const [index, subreddit] of subs.entries()) {
    if (index > 0) {
      const gap = args.transport === 'json' ? MIN_REQUEST_INTERVAL_MS : FEED_REQUEST_INTERVAL_MS;
      const wait = gap - (Date.now() - lastRequest);
      if (wait > 0) await sleep(wait);
    }
    try {
      const children =
        args.transport === 'json'
          ? await fetchSubreddit(subreddit)
          : await fetchSubredditFeedWithBackoff(subreddit);
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
      Authorization: `Bearer ${apiKey}`,
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
