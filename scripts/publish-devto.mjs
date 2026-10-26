#!/usr/bin/env node
/**
 * Publish the prepared posts to Dev.to through the API.
 *
 *   node scripts/publish-devto.mjs            # create drafts
 *   node scripts/publish-devto.mjs --publish  # publish them
 *
 * The API key is read from DEVTO_API_KEY, or from the first line of
 * D:\Android\keys\devto-api-key.txt. It is never printed.
 *
 * The posts are the files in docs/posts/out/*.devto.md, which
 * scripts/prepare-post.mjs generates from the drafts in docs/posts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'posts', 'out');
const KEY_FILE = 'D:\\Android\\keys\\devto-api-key.txt';

const publish = process.argv.includes('--publish');
const only = process.argv.find(a => a.startsWith('--only='))?.split('=')[1];

function readKey() {
  if (process.env.DEVTO_API_KEY) return process.env.DEVTO_API_KEY.trim();
  if (fs.existsSync(KEY_FILE)) {
    const line = fs.readFileSync(KEY_FILE, 'utf8').split(/\r?\n/).find(l => l.trim());
    if (line) return line.trim();
  }
  console.error('No API key. Set DEVTO_API_KEY, or put the key on the first line of');
  console.error(`  ${KEY_FILE}`);
  process.exit(1);
}

/** Minimal front-matter reader: the fields prepare-post.mjs writes. */
function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { body: text, meta: {} };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    meta[key] = value;
  }
  return { body: text.slice(match[0].length), meta };
}

async function main() {
  const key = readKey();
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.devto.md')).sort();
  if (files.length === 0) {
    console.error('No prepared posts. Run: node scripts/prepare-post.mjs <draft.md>');
    process.exit(1);
  }

  for (const file of files) {
    if (only && !file.includes(only)) continue;
    const { body, meta } = parseFrontMatter(fs.readFileSync(path.join(OUT_DIR, file), 'utf8'));
    const tags = (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 4);

    const payload = {
      title: meta.title,
      body_markdown: body,
      published: publish,
      tags,
      description: meta.description,
      cover_image: meta.cover_image || undefined,
    };

    console.log(`\n→ ${meta.title}`);
    console.log(`  tags: ${tags.join(', ')}`);
    console.log(`  ${publish ? 'publishing' : 'saving as draft'}...`);

    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`  FAILED HTTP ${res.status}: ${text.slice(0, 400)}`);
      continue;
    }
    const article = JSON.parse(text);
    console.log(`  ✓ ${article.url}`);
    console.log(`    id ${article.id} · published=${article.published} · comments=${article.comments_count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
