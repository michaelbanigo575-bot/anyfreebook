/**
 * Counts how many outbound HTTP requests one search actually makes.
 *
 * The claim under test is "every search is twelve outbound HTTP requests in
 * parallel". Twelve is the number of *sources*. Some sources need more than
 * one request to answer — Wikisource is a fan-out of one wiki per language,
 * PubMed Central is a search followed by a summary, and the Open Textbook
 * Library serves ten books per page — so the request count is higher than the
 * source count.
 *
 * Run with: node scripts/count-search-requests.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Transpile the whole src tree to plain ESM so Node can import it directly.
// The path alias "@/..." is rewritten to the emitted tree.
const outDir = mkdtempSync(join(tmpdir(), 'afb-count-'));
const srcRoot = join(root, 'src');

function walk(dir) {
  const out = [];
  for (const entry of require('node:fs').readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const file of walk(srcRoot)) {
  const rel = file.slice(srcRoot.length + 1).split('\\').join('/').replace(/\.tsx?$/, '.mjs');
  const dest = join(outDir, ...rel.split('/'));
  require('node:fs').mkdirSync(dirname(dest), { recursive: true });
  let src = readFileSync(file, 'utf8');
  // The "@/..." alias is rewritten to a relative path to the emitted tree, and
  // every relative import gains the .mjs extension Node needs for ESM.
  const dirDepth = rel.split('/').length - 1;
  const prefix = dirDepth === 0 ? './' : '../'.repeat(dirDepth);
  src = src
    .replace(/from '@/g, `from '${prefix}`)
    .replace(/from "@\//g, `from "${prefix}`)
    .replace(/(from\s+['"])(\.[^'"]*?)(['"])/g, (m, a, p, c) => (p.endsWith('.mjs') ? m : `${a}${p}.mjs${c}`));
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve },
    fileName: file,
  });
  writeFileSync(dest, outputText);
}

// Now count. Every outbound request goes through globalThis.fetch, so that is
// the single point to instrument.
const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  calls.push(url);
  return realFetch(input, init);
};

const { searchAllSources } = await import(pathToFileURL(join(outDir, 'lib/api/searchAll.mjs')).href);

calls.length = 0;
const outcome = await searchAllSources('python', 1, 'all', { includeLibrivox: true });

globalThis.fetch = realFetch;

const byHost = {};
for (const url of calls) {
  let host = '(invalid)';
  try {
    host = new URL(url).host;
  } catch {
    /* keep '(invalid)' */
  }
  byHost[host] = (byHost[host] || 0) + 1;
}

// Distinct URLs are the logical requests. Repeats of the same URL are either
// a retry of a transient failure or a cache miss, not an extra source.
const distinct = new Set(calls);

console.log(`outbound HTTP requests for one "all" search: ${calls.length}`);
console.log(`distinct upstream URLs requested:            ${distinct.size}`);
console.log(`sources that answered: ${Object.keys(outcome.sources).length}`);
console.log(`sources that failed:   ${outcome.failedSources.length ? outcome.failedSources.join(', ') : '(none)'}`);
console.log('\nby host:');
for (const [host, n] of Object.entries(byHost).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${host}`);
}
console.log('\nrepeated URLs (retries of a transient failure, or a re-fetch of the same page):');
const seen = new Map();
for (const url of calls) seen.set(url, (seen.get(url) || 0) + 1);
for (const [url, n] of seen) {
  if (n > 1) console.log(`  ${n}x  ${url.slice(0, 110)}`);
}
