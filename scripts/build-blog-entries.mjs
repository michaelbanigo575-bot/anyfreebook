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
  {
    file: 'docs/posts/out/04-classroom-session-history-and-the-rls-hole-behind-it.devto.md',
    slug: 'classroom-session-history-and-the-rls-hole',
    title: 'Recording who was in the room: session history, two partial unique indexes, and the RLS hole it uncovered',
    description:
      'A live class needs history, not just a current state. Recording it properly turned up a schema bug (a unique index over a nullable column is not a uniqueness constraint) and an RLS policy that let any signed-in user make themselves owner of an institution.',
    category: 'Technology',
    readTime: '7 min',
    date: 'Oct 28, 2026',
  },
  {
    file: 'docs/posts/05-back-to-school-encouragement-strategies.md',
    slug: 'back-to-school-encouragement-strategies',
    title: 'Back to School Encouragement Strategies: A 30-Day Re-entry Plan for Returning Students',
    description:
      'A 30-day plan for restarting a course after a break: a seven-day reset before term, weekly routines, money advice and free books.',
    category: 'Guides',
    readTime: '6 min',
    date: 'Oct 28, 2026',
  },
  {
    file: 'docs/posts/06-first-30-days-university-starter-plan.md',
    slug: 'first-30-days-university-starter-plan',
    title: "The Fresher's First 30 Days: A Starter Study Plan for New University Students",
    description:
      'A week-by-week starter plan for a first-year student: what week one is really for, how to read, take notes, and catch up when behind.',
    category: 'Guides',
    readTime: '6 min',
    date: 'Oct 28, 2026',
  },
  {
    file: 'docs/posts/07-researchers-reentry-plan.md',
    slug: 'researchers-reentry-plan',
    title: "The Researcher's Restart: A Systematic Reading and Writing Plan for New Researchers",
    description:
      'A working system for new researchers: triage a literature you cannot read, build an evidence ledger, submit a first paper in twelve weeks.',
    category: 'Guides',
    readTime: '6 min',
    date: 'Oct 28, 2026',
  },
  {
    file: 'docs/posts/08-lecturer-reentry-plan.md',
    slug: 'lecturer-reentry-plan',
    title: "The Lecturer's Re-entry Plan: Designing an Encouraging First Week of Teaching",
    description:
      'A 14-day plan for teaching again: rebuild the course, design a first week that does not humiliate anyone, notice the struggling student.',
    category: 'Guides',
    readTime: '6 min',
    date: 'Oct 28, 2026',
  },
  {
    file: 'docs/posts/09-free-study-resources-reading-plans.md',
    slug: 'free-study-resources-reading-plans',
    title: 'Free Study Resources and Reading Plans: 150 Books and Courses That Cost Nothing',
    description:
      'The open libraries, free textbooks and courseware worth a term, plus six checks to tell a real download from a catalogue record.',
    category: 'Guides',
    readTime: '6 min',
    date: 'Oct 28, 2026',
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
