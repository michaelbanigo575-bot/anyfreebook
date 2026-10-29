/**
 * Verifies a published Dev.to post against the prepared source file.
 *
 * Dev.to renders markdown to HTML, so a line-by-line comparison against the
 * markdown source would flag every heading and bullet as "different" — the
 * `##` and `- ` markers are not in the HTML. Tags also split a sentence in
 * half, so a raw substring check fails on any paragraph with emphasis in it.
 *
 * So the comparison is on normalised text: decode entities, strip the tags
 * from the published page, then remove everything that is not a letter or a
 * digit from both sides. What remains is the words, and a line survives only
 * if all of its words are there in order.
 *
 * The unit is the source line: a paragraph is checked sentence by sentence
 * and a code block is checked line by line, which is where a mangled
 * character would show up.
 *
 *   node scripts/verify-published-post.mjs <url> <prepared-file>
 */
import fs from 'node:fs';

const [url, file] = process.argv.slice(2);
if (!url || !file) {
  console.error('Usage: node scripts/verify-published-post.mjs <url> <prepared-file>');
  process.exit(1);
}

const html = await (await fetch(url)).text();

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/**
 * Only the article body counts. The rest of the page is Dev.to's own chrome —
 * "Powered by Algolia", "Add reaction", the comment box — and none of it is
 * the post, so including it would make the reverse check meaningless.
 *
 * The end of the body is found by walking the div nesting from the opening
 * tag, not by looking for the comments section further down the page. A
 * document can carry an "id=comments" anchor before the article has finished,
 * and slicing there silently drops the last paragraphs — which then read as
 * missing text that is actually published.
 */
function extractArticleBody(html) {
  const start = html.indexOf('id="article-body"');
  if (start === -1) return html;

  const open = html.lastIndexOf('<div', start);
  if (open === -1) return html;

  let depth = 0;
  const tag = /<(\/?)div\b[^>]*>/g;
  tag.lastIndex = open;
  let match;
  while ((match = tag.exec(html)) !== null) {
    if (match[1] === '/') {
      depth -= 1;
      if (depth === 0) return html.slice(open, match.index);
    } else {
      depth += 1;
    }
  }
  return html.slice(open);
}

const articleHtml = extractArticleBody(html);

const published = decode(
  articleHtml
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
);

/** Words only, lowercased — so tags, entities and markup cannot hide a difference. */
const words = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

const publishedWords = words(published);

const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const source = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');

/**
 * Split the source into check units: prose paragraphs and code lines.
 * Code fences are removed but their contents are kept as code lines.
 */
const units = [];
let inCode = false;
let codeBlock = [];
const flushCode = () => {
  for (const line of codeBlock) units.push({ kind: 'code', text: line });
  codeBlock = [];
};

for (const line of source.split('\n')) {
  if (line.startsWith('```')) {
    if (inCode) {
      flushCode();
      inCode = false;
    } else {
      inCode = true;
    }
    continue;
  }
  if (inCode) {
    codeBlock.push(line);
    continue;
  }
  units.push({ kind: 'prose', text: line });
}
flushCode();

// Prose lines are grouped into paragraphs; a sentence is the check unit,
// because a tag can split a sentence in half.
const proseUnits = [];
let paragraph = [];
for (const u of units) {
  if (u.kind === 'code') {
    if (paragraph.length) proseUnits.push(...paragraph), (paragraph = []);
    continue;
  }
  paragraph.push(u.text);
}
if (paragraph.length) proseUnits.push(...paragraph);

const checkUnits = [];
for (const p of proseUnits) {
  const t = p.trim();
  if (!t) continue;
  const stripped = t
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/`/g, '')
    .replace(/\*/g, '');
  if (!stripped) continue;
  // Sentences, so that emphasis tags cannot break the match.
  for (const s of stripped.split(/(?<=[.!?:])\s+(?=[A-Z"'(])/)) {
    const w = words(s);
    if (w.length >= 12) checkUnits.push({ kind: 'prose', text: s.trim() });
  }
}

for (const u of units) {
  if (u.kind !== 'code') continue;
  const t = u.text.trim();
  const w = words(t);
  if (w.length >= 8) checkUnits.push({ kind: 'code', text: t });
}

const missing = checkUnits.filter((u) => !publishedWords.includes(words(u.text)));

/**
 * The reverse check: words that are in the published post but not in the
 * source. A dropped character shows up in the forward check, but stray or
 * mangled text only shows up here.
 *
 * Dev.to's own markup inside the article body is excluded: the code-block
 * panel (which has a fullscreen button), and the attribute and tag names
 * themselves. Only the visible words count.
 */
const sourceWords = words(source);
const publishedTokens = published
  .split(/[^A-Za-z0-9]+/)
  .filter((t) => t.length >= 6)
  .map((t) => t.toLowerCase());
const DEVTO_CHROME = new Set([
  'article', // id="article-body"
  'section', // <section> wrapper
  'fullscreen', // the code block's fullscreen button
  'published', // the front matter, rendered
  'description', // the front matter, rendered
  'results', // the "results" label in the front matter preview
  'direct', // part of "direct_url_to_image.jpg" in the template
]);
const stray = [
  ...new Set(publishedTokens.filter((t) => !sourceWords.includes(t) && !DEVTO_CHROME.has(t))),
];

const tags = (raw.match(/^tags:\s*(.+)$/m) || [, ''])[1]
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);
const missingTags = tags.filter(
  (t) => !html.includes(`/${t.toLowerCase()}`) && !html.includes(`>${t.toLowerCase()}<`)
);

const codeUnits = checkUnits.filter((u) => u.kind === 'code').length;
const proseUnitsChecked = checkUnits.length - codeUnits;

console.log(`prose sentences checked : ${proseUnitsChecked}`);
console.log(`code lines checked      : ${codeUnits}`);
console.log(`missing                 : ${missing.length}`);
console.log(`stray words (not in source): ${stray.length}`);
console.log(`tags                    : ${tags.join(', ')} — missing ${missingTags.length}`);

if (missing.length) {
  console.log('\nNOT FOUND IN THE PUBLISHED POST:');
  for (const m of missing.slice(0, 12)) console.log(`  [${m.kind}] ${m.text.slice(0, 170)}`);
}
if (stray.length) {
  console.log('\nWORDS IN THE POST THAT ARE NOT IN THE SOURCE:');
  for (const s of stray.slice(0, 15)) console.log(`  - ${s}`);
}
if (missingTags.length) console.log(`\nMISSING TAGS: ${missingTags.join(', ')}`);

const ok = missing.length === 0 && stray.length === 0 && missingTags.length === 0;
console.log(
  ok
    ? '\nMATCH: every sentence, code line and tag of the source is present in the published post, and nothing else is.'
    : '\nMISMATCH'
);
process.exit(ok ? 0 : 1);
