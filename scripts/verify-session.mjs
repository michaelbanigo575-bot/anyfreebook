/**
 * Verifies the sign-in session, server-side, with the site's own cookie adapter.
 *
 * The complaint was "sign-in sometimes does not stick". The suspected cause was
 * the Supabase client being wired to the deprecated get/set/remove cookie API,
 * which can write only part of a chunked auth cookie, so the next request reads
 * a half-written cookie as no session.
 *
 * This test runs both cookie adapters side by side — the deprecated one the
 * site used, and the getAll/setAll one it uses now — and for each one:
 *
 *   1. signs in,
 *   2. collects the cookies the adapter produced,
 *   3. sends them to the live site,
 *   4. asks the site who it thinks the caller is.
 *
 * If the deprecated adapter loses chunks and the current one does not, that is
 * the bug and the fix, proved rather than assumed.
 *
 *   node scripts/verify-session.mjs
 */
import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.AFB_TEST_EMAIL || 'michaelbanigo575+test1@gmail.com';
const PASSWORD = process.env.AFB_TEST_PASSWORD || 'afb-session-test-9x2k';

if (!URL || !ANON || !SERVICE) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// A cookie jar, the way a browser has one.
function makeJar() {
  const jar = new Map();
  return {
    jar,
    absorb(response) {
      const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
      for (const line of raw) {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (value === '') jar.delete(name);
        else jar.set(name, value);
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    names() {
      return [...jar.keys()];
    },
  };
}

async function signInWith(adapter) {
  const { jar, absorb, header, names } = makeJar();

  const cookies =
    adapter === 'deprecated'
      ? {
          get(name) {
            return jar.get(name);
          },
          set(name, value) {
            jar.set(name, value);
          },
          remove(name) {
            jar.delete(name);
          },
        }
      : {
          getAll() {
            return [...jar.entries()].map(([name, value]) => ({ name, value }));
          },
          setAll(list) {
            for (const { name, value } of list) jar.set(name, value);
          },
        };

  const client = createServerClient(URL, ANON, { cookies, auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`${adapter} sign-in failed: ${error.message}`);

  // The adapter may write the session cookie lazily; ask for it explicitly.
  await client.auth.getSession();

  return { jar, absorb, header, names, user: data.user };
}

async function askTheSite(header) {
  // The institution page shows "Join this institution" for any non-member,
  // signed in or not. The signal that distinguishes the two is the extra
  // "Sign in to join" link, which is only rendered when there is no session.
  const res = await fetch('https://anyfreebook.com/institutions/prophet-jubelo', {
    headers: { Cookie: header },
  });
  const html = await res.text();
  return {
    status: res.status,
    // "Sign in to join" means the server found no session.
    signedOut: html.includes('Sign in to join'),
    // A signed-in visitor sees the member list rather than the join prompt.
    joinButton: html.includes('Join this institution'),
  };
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
}

// Make sure the test account exists with a known password.
const { createClient } = await import('@supabase/supabase-js');
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const user = userList?.users?.find((u) => u.email === EMAIL);
if (!user) {
  console.error(`Test account ${EMAIL} not found.`);
  process.exit(1);
}
await admin.auth.admin.updateUserById(user.id, {
  password: PASSWORD,
  email_confirm: true,
  // A long display name pushes the session cookie past the 3180-byte chunk
  // limit, which is the case that actually bites in production.
  user_metadata: { display_name: 'Session Chunk Test ' + 'x'.repeat(400) },
});
check('test account ready', true, EMAIL);

for (const adapter of ['deprecated', 'current']) {
  let ctx;
  try {
    ctx = await signInWith(adapter);
  } catch (e) {
    check(`${adapter} adapter signs in`, false, e.message);
    continue;
  }
  check(`${adapter} adapter signs in`, true, ctx.user.email);

  const authCookies = ctx.names().filter((n) => n.includes('auth-token'));
  const total = ctx.names().length;
  const cookieValue = ctx.jar.get('sb-ichmkzwjaftteyzrbwji-auth-token') || '';
  check(
    `${adapter} adapter produced the auth cookie`,
    authCookies.length > 0,
    `${authCookies.length} auth cookie(s) (${authCookies.join(', ')}), ${total} total, value ${cookieValue.length} bytes`
  );

  const { status, signedOut, joinButton } = await askTheSite(ctx.header());
  check(
    `${adapter} adapter -> the site sees a signed-in session`,
    signedOut === false,
    `status ${status}, "Sign in to join" shown=${signedOut}, "Join this institution" shown=${joinButton}`
  );
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n      ${r.detail ?? ''}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
