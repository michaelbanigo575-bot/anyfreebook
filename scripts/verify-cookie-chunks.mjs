/**
 * Proves the chunk-loss mechanism in the middleware.
 *
 * @supabase/ssr writes a long auth cookie as several chunks and hands them to
 * the adapter in ONE setAll() call. The old middleware implemented that call as
 * a loop of set() calls, and each set() replaced the whole NextResponse:
 *
 *     set(name, value, options) {
 *       request.cookies.set(...);
 *       response = NextResponse.next({ request: { headers: request.headers } });  // <- new response
 *       response.cookies.set({ name, value, ...options });                       // <- only this chunk on it
 *     }
 *
 * So with two chunks the second call threw the first chunk's Set-Cookie away,
 * the browser received half a cookie, and the next request read it as no
 * session at all. That is the "chunked cookie decoded to invalid JSON"
 * warning, and it is why sign-in sometimes did not stick.
 *
 * The current middleware collects the chunks and writes them all onto one
 * response, so nothing is lost.
 *
 *   node scripts/verify-cookie-chunks.mjs
 */

// A stand-in for a NextResponse: it accumulates Set-Cookie headers.
class FakeResponse {
  constructor() {
    this.headers = new Map();
  }
  setCookie(name, value) {
    const list = this.headers.get('set-cookie') || [];
    list.push(`${name}=${value}`);
    this.headers.set('set-cookie', list);
  }
  cookieNames() {
    return (this.headers.get('set-cookie') || []).map((c) => c.split('=')[0]);
  }
}

const CHUNKS = [
  ['sb-ref-auth-token.0', 'part-one'],
  ['sb-ref-auth-token.1', 'part-two'],
];

// --- The old middleware's shape: each set() replaces the response. ---
{
  let response = new FakeResponse();
  const request = { cookies: { set() {} } };
  for (const [name, value] of CHUNKS) {
    request.cookies.set({ name, value });
    response = new FakeResponse(); // NextResponse.next() — a fresh response
    response.setCookie(name, value);
  }
  console.log('old middleware  -> response carries:', response.cookieNames().join(', '));
}

// --- The current middleware's shape: every chunk goes onto one response. ---
{
  let response = new FakeResponse();
  const request = { cookies: { set() {} } };
  const cookiesToSet = CHUNKS.map(([name, value]) => ({ name, value }));
  for (const { name, value } of cookiesToSet) {
    request.cookies.set(name, value);
  }
  response = new FakeResponse(); // NextResponse.next() — created once
  for (const { name, value } of cookiesToSet) {
    response.setCookie(name, value);
  }
  console.log('current one     -> response carries:', response.cookieNames().join(', '));
}
