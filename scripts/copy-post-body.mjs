import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/copy-post-body.mjs <prepared-file.md>');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
// Strip the YAML front matter — Dev.to's editor sets the title, description
// and tags from its own fields, and a pasted front-matter block would be
// rendered as literal text.
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

const tmp = 'D:\\Android\\tmp\\post-body.md';
fs.writeFileSync(tmp, body, 'utf8');
execFileSync('powershell.exe', [
  '-NoProfile',
  '-Command',
  `Get-Content -LiteralPath '${tmp.replace(/\\/g, '\\\\')}' -Raw | Set-Clipboard`,
]);

console.log(`copied ${body.length} chars of body (front matter stripped) to the clipboard`);
console.log(`first line: ${body.split(/\r?\n/)[0].slice(0, 80)}`);
