/**
 * Verifies the honest-failure contract in src/lib/api/http.ts.
 *
 * Three things must hold:
 *   1. An upstream that answers "no matches" (404 on LibriVox-style APIs) is
 *      reported as zero results, not as a failure.
 *   2. An upstream that answers with a 503 is thrown, so the caller records
 *      the source as failed — after the transient retry.
 *   3. A transient 503 that recovers on the second attempt is NOT a failure.
 *
 * A local HTTP server stands in for the upstream, so the test needs no network
 * access and no third-party service to be up.
 *
 * Run with: node scripts/verify-upstream-failures.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const PORT = 41377;
let mode = 'ok';
let hits = 0;

const server = createServer((req, res) => {
  hits++;
  if (mode === 'ok') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (mode === 'notFound') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Audiobooks could not be found' }));
    return;
  }
  if (mode === 'flaky') {
    // Fails once, then recovers.
    if (hits === 1) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service temporarily unavailable.' }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, recovered: true }));
    }
    return;
  }
  if (mode === 'down') {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Service temporarily unavailable.' }));
    return;
  }
  res.writeHead(500);
  res.end();
});

await new Promise(resolve => server.listen(PORT, resolve));

// http.ts is self-contained (no imports), so it can be transpiled on its own
// and loaded as an ES module.
const source = readFileSync('src/lib/api/http.ts', 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const dir = mkdtempSync(join(tmpdir(), 'afb-http-'));
const modPath = join(dir, 'http.mjs');
writeFileSync(modPath, outputText);
const { fetchUpstreamJson, UpstreamError } = await import(`file://${modPath}`);

const url = `http://127.0.0.1:${PORT}/x`;
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
}

// 1. A 404 that means "no matches" is an answer, not a failure.
mode = 'notFound';
hits = 0;
const empty = await fetchUpstreamJson(url, {}, { source: 'Test', emptyOnStatus: [404] });
check(
  '404 (no-match) returns null, not a throw',
  empty === null,
  `got ${empty === null ? 'null' : JSON.stringify(empty)}`
);

// 2. A 503 with no recovery is thrown, after the transient retries.
mode = 'down';
hits = 0;
let threw = null;
try {
  await fetchUpstreamJson(url, {}, { source: 'Test' });
} catch (err) {
  threw = err;
}
check(
  'persistent 503 throws UpstreamError',
  threw instanceof UpstreamError,
  threw ? `threw ${threw.name}: ${threw.message}` : 'did not throw'
);
check(
  'persistent 503 was retried before failing',
  hits === 3,
  `upstream was called ${hits} times (1 attempt + 2 retries)`
);

// 3. A transient 503 that recovers is not a failure.
mode = 'flaky';
hits = 0;
let recovered = null;
let flakyThrew = null;
try {
  recovered = await fetchUpstreamJson(url, {}, { source: 'Test' });
} catch (err) {
  flakyThrew = err;
}
check(
  'transient 503 that recovers on retry succeeds',
  flakyThrew === null && recovered && recovered.recovered === true,
  flakyThrew ? `threw ${flakyThrew.message}` : `recovered after ${hits} attempts`
);

// 4. A 404 that is NOT declared as no-match is a genuine failure.
mode = 'notFound';
hits = 0;
let wrongKind = null;
try {
  await fetchUpstreamJson(url, {}, { source: 'Test' });
} catch (err) {
  wrongKind = err;
}
check(
  'undeclared 404 is a failure, not an empty answer',
  wrongKind instanceof UpstreamError,
  wrongKind ? `threw ${wrongKind.name}` : 'did not throw'
);

server.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n      ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
