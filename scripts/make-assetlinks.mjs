/**
 * Writes public/.well-known/assetlinks.json for the Trusted Web Activity.
 *
 *   node scripts/make-assetlinks.mjs com.anyfreebook.app AA:BB:CC:...
 *   node scripts/make-assetlinks.mjs --print com.anyfreebook.app AA:BB:CC:...
 *
 * IMPORTANT — use the **Play App Signing** certificate fingerprint, not the
 * upload-key fingerprint. Play re-signs your AAB with its own key before
 * delivery, so the key you sign locally is not the key the device trusts.
 * Find it in Play Console under:
 *   Test and release > Testing > App integrity > App signing key > SHA-256
 *
 * The file must be served from https://anyfreebook.com/.well-known/assetlinks.json
 * (same origin as the TWA's start URL) with Content-Type application/json.
 *
 * The fingerprints are written in UPPERCASE. Google's Digital Asset Links
 * validator parses them with the same pattern Bubblewrap uses —
 * /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/ — and rejects a lowercase fingerprint as
 * "malformed cert fingerprint", even though the bytes are identical.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', '.well-known');
const outFile = join(outDir, 'assetlinks.json');

const args = process.argv.slice(2);
const printOnly = args.includes('--print');
const positional = args.filter((a) => a !== '--print');

const [packageName, ...fingerprints] = positional;

if (!packageName || fingerprints.length === 0) {
  console.error(
    'Usage: node scripts/make-assetlinks.mjs [--print] <package-name> <sha256-fingerprint> [<sha256-fingerprint> ...]'
  );
  console.error('');
  console.error('Example:');
  console.error('  node scripts/make-assetlinks.mjs com.anyfreebook.app 12:34:56:...:AB');
  process.exit(1);
}

const cleaned = fingerprints.map((f) => f.trim().replace(/^SHA256\s*/i, '').toUpperCase());

const invalid = cleaned.filter((f) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
if (invalid.length > 0) {
  console.error('These do not look like SHA-256 fingerprints (expected 32 uppercase hex octets):');
  for (const f of invalid) console.error('  ' + f);
  process.exit(1);
}

const doc = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: cleaned,
    },
  },
];

const json = JSON.stringify(doc, null, 2) + '\n';

if (printOnly) {
  process.stdout.write(json);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, json);
console.log('wrote public/.well-known/assetlinks.json');
console.log(json);
console.log('Next: commit it, deploy, then verify at');
console.log('  https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://anyfreebook.com&source.android.app_id=' + packageName);
