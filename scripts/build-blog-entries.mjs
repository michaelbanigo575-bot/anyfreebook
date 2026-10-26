import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { markdownToBlocks, toSource } from './markdown-to-blog-blocks.mjs';

const ROOT = 'D:/ANYFREEBOOK';
const OUT = 'D:\\Android\\tmp\\blog-entries.ts';

const POSTS = [
  {
    file: 'docs/posts/out/01-fanning-out-search-across-twelve-open-apis.devto.md',
    slug: 'fanning-out-search-across-twelve-apis',
    title: 'Fanning out a search across twelve APIs, and telling the user when one of them fails',
    description:
      'A multi-source search has a failure mode most implementations hide: one dead upstream silently shrinks the result set, and the reader cannot tell "that is all there is" from "we could not ask".',
    category: 'Technology',
    readTime: '7 min',
    date: 'Oct 26, 2026',
  },
  {
    file: 'docs/posts/out/02-your-free-book-api-might-not-be-free.devto.md',
    slug: 'your-free-book-api-might-not-be-free',
    title: 'Your "free" book API might not be free',
    description:
      'A book-search API hands you a URL and calls it free, but that URL may be a public-domain text, a borrow-only lending copy, or a catalogue record for a book still in copyright — and linking to it is a legal claim you cannot support.',
    category: 'Technology',
    readTime: '7 min',
    date: 'Oct 26, 2026',
  },
  {
    file: 'docs/posts/out/03-one-codebase-two-install-paths-pwa-and-twa.devto.md',
    slug: 'one-codebase-two-install-paths-pwa-and-twa',
    title: 'One codebase, two install paths: shipping a PWA and an Android app from the same Next.js site',
    description:
      'The Play app is a 1.2 MB shell around the website, but the Digital Asset Links handshake has two traps in it: an uppercase-only fingerprint validator and the difference between your upload key and Play\'s app-signing key.',
    category: 'Technology',
    readTime: '7 min',
    date: 'Oct 26, 2026',
  },
];

let source = '';
for (const post of POSTS) {
  const markdown = fs
    .readFileSync(`${ROOT}/${post.file}`, 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const blocks = markdownToBlocks(markdown);
  const counts = blocks.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {});
  console.log(`${post.slug}: ${JSON.stringify(counts)}`);
  source += toSource({ ...post, content: blocks }) + '\n';
}

fs.writeFileSync(OUT, source, 'utf8');
console.log(`\nwrote ${source.length} chars to ${OUT}`);
