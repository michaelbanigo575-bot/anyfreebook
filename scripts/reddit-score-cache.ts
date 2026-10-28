#!/usr/bin/env node
/**
 * Score the threads in .reddit-cache against the real intent scorer, so the
 * threshold can be judged against real data instead of guessed at.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/reddit-score-cache.ts
 *
 * Nothing is fetched and nothing is sent. This reads the local cache that
 * scripts/reddit-discover.mjs writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreIntent } from '../src/lib/reddit/discovery.ts';
import { REDDIT_TARGETS } from '../src/lib/reddit/targets.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.reddit-cache');

if (!fs.existsSync(CACHE)) {
  console.error('No cache yet. Run scripts/reddit-discover.mjs first.');
  process.exit(1);
}

const files = fs.readdirSync(CACHE).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) {
  console.error('The cache is empty.');
  process.exit(1);
}

for (const file of files) {
  const subreddit = file.split('-')[0];
  const target = REDDIT_TARGETS.find((t) => t.subreddit === subreddit);
  if (!target) continue;

  const children = JSON.parse(fs.readFileSync(path.join(CACHE, file), 'utf8'));
  const now = Date.now();

  const scored = children
    .map((child: { data: { title?: string; selftext?: string; created_utc?: number } }) => {
      const d = child.data;
      const ageHours = (now - (d.created_utc ?? 0) * 1000) / 3_600_000;
      const { score, signals } = scoreIntent(d.title ?? '', d.selftext ?? '', target.intentKeywords);
      return { title: d.title ?? '', score, signals, ageHours };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  console.log(`\n=== ${file} — ${children.length} threads ===`);
  for (const row of scored.slice(0, 6)) {
    const age = row.ageHours >= 0 ? `${row.ageHours.toFixed(1)}h` : 'future';
    console.log(`  [${row.score}] (${age}) ${row.title}`);
    if (row.score > 0) console.log(`        ${row.signals.join(', ')}`);
  }
  const over = scored.filter((r: { score: number }) => r.score >= 30).length;
  const near = scored.filter((r: { score: number }) => r.score >= 15 && r.score < 30).length;
  console.log(`  over 30: ${over} · between 15 and 30: ${near}`);
}
