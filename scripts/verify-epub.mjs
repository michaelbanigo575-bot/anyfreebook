/**
 * Checks that the EPUB writer produces a real ZIP archive with the layout a
 * reader expects: the mimetype entry first and stored uncompressed, the
 * container and package documents present, and every CRC correct.
 *
 * Run with: node scripts/verify-epub.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const src = readFileSync('src/lib/creators/epub.ts', 'utf8');
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});

const dir = mkdtempSync(join(tmpdir(), 'afb-epub-'));
const modPath = join(dir, 'epub.mjs');
writeFileSync(modPath, outputText);
const { buildEpub } = await import(`file://${modPath}`);

const epub = buildEpub({
  title: 'A Test Work',
  author: 'A. Author',
  description: 'A description with an ampersand & a <tag>.',
  identifier: '12345678-1234-1234-1234-123456789012',
  chapters: [
    { title: 'Chapter One', html: '    <h1>Chapter One</h1>\n    <p>First paragraph.</p>' },
    { title: 'Chapter Two', html: '    <h1>Chapter Two</h1>\n    <p>Second paragraph.</p>' },
  ],
});

const epubPath = join(dir, 'test.epub');
writeFileSync(epubPath, epub);

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
}

// 1. It must be a real ZIP.
let listed = '';
try {
  listed = execFileSync('python', ['-c', `
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1])
bad = z.testzip()
print("OK" if bad is None else "CORRUPT:" + str(bad))
for i in z.infolist():
    print(i.filename, i.compress_type, i.file_size)
`, epubPath], { encoding: 'utf8' });
} catch (e) {
  listed = 'python check failed: ' + e.message;
}
check('archive opens and passes CRC validation', listed.startsWith('OK'), listed.split('\n')[0]);

// 2. The mimetype entry must be first and stored (compress_type 0).
const lines = listed.split('\n').filter(Boolean);
const first = lines[1] || '';
check(
  'mimetype is the first entry',
  first.startsWith('mimetype '),
  first
);
check(
  'mimetype is stored uncompressed',
  first.includes(' 0 '),
  first
);

// 3. The required documents are present.
for (const required of ['META-INF/container.xml', 'OEBPS/content.opf', 'OEBPS/nav.xhtml', 'OEBPS/chapter1.xhtml', 'OEBPS/chapter2.xhtml']) {
  check(`${required} is present`, listed.includes(required), '');
}

// 4. The mimetype content is exactly right.
try {
  const mime = execFileSync('python', ['-c', `
import zipfile, sys
z = zipfile.ZipFile(sys.argv[1])
print(repr(z.read('mimetype').decode()))
`, epubPath], { encoding: 'utf8' }).trim();
  check('mimetype content is exact', mime === "'application/epub+zip'", mime);
} catch (e) {
  check('mimetype content is exact', false, e.message);
}

// 5. The package document must parse as XML and reference both chapters.
try {
  const xml = execFileSync('python', ['-c', `
import zipfile, sys, xml.etree.ElementTree as ET
z = zipfile.ZipFile(sys.argv[1])
opf = z.read('OEBPS/content.opf').decode()
ET.fromstring(opf)
print("chapters:", opf.count('application/xhtml+xml'))
print("title_ok:", "A Test Work" in opf)
print("escaped:", "&amp;" in opf and "&lt;tag&gt;" in opf)
`, epubPath], { encoding: 'utf8' });
  check('content.opf is valid XML', true, xml.split('\n')[0]);
  // Two chapters plus the nav document = three xhtml items.
  check('opf lists the xhtml items', xml.includes('chapters: 3'), xml.replace(/\n/g, ' '));
  check('title is present', xml.includes('title_ok: True'), '');
  check('xml special characters are escaped', xml.includes('escaped: True'), '');
} catch (e) {
  check('content.opf is valid XML', false, e.message);
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `\n      ${String(r.detail).trim()}` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
console.log(`\nepub written to: ${epubPath} (${epub.length} bytes)`);
process.exit(failed === 0 ? 0 : 1);
