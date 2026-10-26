#!/usr/bin/env node
/**
 * Splices the generated blog entries into src/lib/blogPosts.ts.
 *
 * build-blog-entries.mjs writes the three technical posts to a temp file as
 * ready-to-paste TypeScript. This script replaces the block in blogPosts.ts
 * that holds those three posts with the freshly generated one, so the site and
 * the published drafts can never drift apart.
 *
 *   node scripts/apply-blog-entries.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GENERATED = 'D:\\Android\\tmp\\blog-entries.ts';
const TARGET = path.join(ROOT, 'src', 'lib', 'blogPosts.ts');

if (!fs.existsSync(GENERATED)) {
  console.error(`Not found: ${GENERATED}. Run: node scripts/build-blog-entries.mjs`);
  process.exit(1);
}

const generated = fs.readFileSync(GENERATED, 'utf8').trimEnd();
const target = fs.readFileSync(TARGET, 'utf8');

// The three technical posts are the ones with these slugs. They are the last
// entries in the array, so the block runs from the first of them to the end of
// the array.
const MARKER = "    slug: \"fanning-out-search-across-twelve-apis\",";
const start = target.indexOf(MARKER);
if (start === -1) {
  console.error('Could not find the start of the generated posts block in blogPosts.ts.');
  process.exit(1);
}

// Walk back to the opening brace of that post object.
const objStart = target.lastIndexOf('  {\n', start);
if (objStart === -1) {
  console.error('Could not find the opening brace of the posts block.');
  process.exit(1);
}

// The array closes with "];\n" — find it after the last post.
const arrayEnd = target.indexOf('\n];', objStart);
if (arrayEnd === -1) {
  console.error('Could not find the end of the BLOG_POSTS array.');
  process.exit(1);
}

const before = target.slice(0, objStart);
const after = target.slice(arrayEnd);

const updated = before + generated + '\n' + after;
fs.writeFileSync(TARGET, updated, 'utf8');

const postCount = (updated.match(/^\s{4}slug: /gm) || []).length;
console.log(`Spliced the generated posts into ${path.relative(ROOT, TARGET)}`);
console.log(`  posts in the array now: ${postCount}`);
console.log(`  bytes: ${target.length} -> ${updated.length}`);
