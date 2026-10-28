#!/usr/bin/env node
/**
 * Turn a post draft into a publish-ready file for a platform.
 *
 * The drafts in docs/posts are written to be read as plain markdown in the
 * repository: they start with an H1 and have no front matter. Dev.to and
 * Hashnode want front matter and use the front-matter title as the post
 * title, so a body H1 would render as a second heading.
 *
 * This script does that transformation so the source of truth stays a single
 * file and the published artefact is derived, never hand-maintained.
 *
 *   node scripts/prepare-post.mjs 01-fanning-out-search-across-seven-open-apis.md
 *   node scripts/prepare-post.mjs 02-your-free-book-api-might-not-be-free.md --out ./post.md
 *
 * The tags come from the per-post table below, matching the platform notes in
 * docs/posts/README.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', 'docs', 'posts');

/** Tags per post, as agreed in docs/posts/README.md. */
const TAGS = {
  '01-fanning-out-search-across-twelve-open-apis.md': ['webdev', 'api', 'typescript', 'nextjs'],
  '02-your-free-book-api-might-not-be-free.md': ['api', 'legal', 'licensing', 'typescript'],
  '03-one-codebase-two-install-paths-pwa-and-twa.md': ['android', 'pwa', 'twa', 'nextjs'],
  '04-classroom-session-history-and-the-rls-hole-behind-it.md': ['postgres', 'security', 'rls', 'database'],
};

/** One-line summaries, used for the description and the social preview. */
const DESCRIPTIONS = {
  '01-fanning-out-search-across-twelve-open-apis.md':
    'A multi-source search has a failure mode most implementations hide: one dead upstream silently shrinks the result set, and the reader cannot tell "that is all there is" from "we could not ask".',
  '02-your-free-book-api-might-not-be-free.md':
    'A book-search API hands you a URL and calls it free, but that URL may be a public-domain text, a borrow-only lending copy, or a catalogue record for a book still in copyright — and linking to it is a legal claim you cannot support.',
  '03-one-codebase-two-install-paths-pwa-and-twa.md':
    'The Play app is a 1.2 MB shell around the website, but the Digital Asset Links handshake has two traps in it: an uppercase-only fingerprint validator and the difference between your upload key and Play\'s app-signing key.',
  '04-classroom-session-history-and-the-rls-hole-behind-it.md':
    'A live class needs history, not just a current state. Recording it properly turned up a schema bug (a unique index over a nullable column is not a uniqueness constraint) and an RLS policy that let any signed-in user make themselves owner of an institution.',
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const outIndex = args.indexOf('--out');

if (!file) {
  console.error('Usage: node scripts/prepare-post.mjs <post-file.md> [--out <file>]');
  console.error('');
  console.error('Available posts:');
  for (const name of Object.keys(TAGS)) console.error(`  ${name}`);
  process.exitCode = 1;
} else {
  const source = path.resolve(POSTS_DIR, file);
  if (!fs.existsSync(source)) {
    console.error(`Not found: ${source}`);
    process.exitCode = 1;
  } else {
    const raw = fs.readFileSync(source, 'utf8');
    const tags = TAGS[path.basename(file)];
    const description = DESCRIPTIONS[path.basename(file)];

    if (!tags || !description) {
      console.error(`No tags or description recorded for ${file}. Add them to scripts/prepare-post.mjs.`);
      process.exitCode = 1;
    } else {
      // The title is the H1, which is about to be removed because the
      // front-matter title becomes the post title.
      const heading = raw.match(/^#\s+(.+)$/m);
      const title = heading ? heading[1].trim() : '';
      // Drop the body H1: the front-matter title becomes the post title.
      const body = raw.replace(/^#\s+.*\r?\n+/, '').trim();

      const frontMatter = [
        '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        `description: "${description.replace(/"/g, '\\"')}"`,
        `tags: ${tags.join(', ')}`,
        'published: false',
        `cover_image: https://anyfreebook.com/api/og?title=${encodeURIComponent(title)}`,
        '---',
        '',
      ].join('\n');

      const output = frontMatter + body + '\n';
      const target = outIndex !== -1 && args[outIndex + 1]
        ? path.resolve(args[outIndex + 1])
        : path.join(POSTS_DIR, 'out', `${path.basename(file, '.md')}.devto.md`);

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, output, 'utf8');

      console.log(`Prepared ${path.relative(path.resolve(__dirname, '..'), target)}`);
      console.log(`  title: ${title}`);
      console.log(`  tags : ${tags.join(', ')}`);
      console.log('');
      console.log('Open dev.to/new, paste the file, set the cover image if you want a different one,');
      console.log('and publish. "published: false" keeps it a draft until you press publish.');
    }
  }
}
