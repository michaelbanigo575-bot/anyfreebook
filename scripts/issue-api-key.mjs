/**
 * Issues an API key for the public API (/api/v1/*).
 *
 *   set NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/issue-api-key.mjs --label "my app" [--tier free|partner] [--rpm 60] [--rpd 2000]
 *
 * The key is printed ONCE and only its SHA-256 hash is stored, so a leaked
 * database dump does not hand anyone a usable key. Store the plaintext
 * somewhere safe — you can see the hash, but not the key, again.
 *
 * Requires supabase/migrations/012_public_api.sql to have been applied.
 */
import { createHash, randomBytes } from 'node:crypto';

const args = process.argv.slice(2);

function flag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) return true;
  return value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  console.error('');
  console.error('PowerShell:');
  console.error('  $env:NEXT_PUBLIC_SUPABASE_URL = "https://xxxx.supabase.co"');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."');
  process.exit(1);
}

const label = String(flag('label', 'unnamed'));
const tier = String(flag('tier', 'free'));
if (!['free', 'partner'].includes(tier)) {
  console.error('--tier must be "free" or "partner".');
  process.exit(1);
}
const rpm = parseInt(String(flag('rpm', tier === 'partner' ? '300' : '60')), 10);
const rpdArg = flag('rpd', tier === 'partner' ? '50000' : '2000');
const rpd = rpdArg === true || rpdArg === 'null' ? null : parseInt(String(rpdArg), 10);

// afb_ + 40 hex characters = 160 bits of entropy.
const plain = `afb_${randomBytes(20).toString('hex')}`;
const keyHash = createHash('sha256').update(plain).digest('hex');

const body = {
  key_hash: keyHash,
  label,
  tier,
  requests_per_minute: Number.isFinite(rpm) && rpm > 0 ? rpm : 60,
  requests_per_day: Number.isFinite(rpd) && rpd > 0 ? rpd : null,
  is_active: true,
};

const res = await fetch(`${url}/rest/v1/api_keys`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=minimal',
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Could not create the key: ${res.status} ${res.statusText}`);
  console.error(text);
  if (res.status === 404 || text.includes('does not exist')) {
    console.error('');
    console.error('The api_keys table is missing. Apply supabase/migrations/012_public_api.sql first.');
  }
  process.exit(1);
}

console.log('API key created. Copy it now — it is not shown again.');
console.log('');
console.log(`  ${plain}`);
console.log('');
console.log(`label:        ${label}`);
console.log(`tier:         ${tier}`);
console.log(`per minute:   ${body.requests_per_minute}`);
console.log(`per day:      ${body.requests_per_day ?? 'unlimited'}`);
console.log('');
console.log('Use it with:');
console.log(`  curl -H "Authorization: Bearer ${plain}" "https://anyfreebook.com/api/v1/search?q=python"`);
console.log(`  $env:ANYFREEBOOK_API_KEY = "${plain}"`);
