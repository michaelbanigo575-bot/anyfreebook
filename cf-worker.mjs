// Cloudflare entry: the site itself (built by OpenNext) plus the scheduled jobs
// that used to live in vercel.json.
import worker from './.open-next/worker.js';

const CRON_ROUTES = {
  '0 3 * * *': '/api/cron/end-stale-classes',
  '0 8 * * *': '/api/cron/daily-distribution',
};

/**
 * Browsers must ask again before reusing a page. The framework's own header lets them show a
 * saved copy for up to 30 days, which keeps old pages (and links to removed style files) alive
 * after a deploy. Hashed scripts and styles are unaffected and stay cached for a year.
 */
async function freshPages(request, env, ctx) {
  const url = new URL(request.url);
  // App-link verification files must answer on every host without a redirect
  if (url.hostname === 'www.anyfreebook.com' && !url.pathname.startsWith('/.well-known/')) {
    url.hostname = 'anyfreebook.com';
    return Response.redirect(url.toString(), 308);
  }

  const response = await worker.fetch(request, env, ctx);
  const cache = response.headers.get('cache-control') || '';
  const isPage = (response.headers.get('content-type') || '').startsWith('text/html')
    || (response.headers.get('content-type') || '').startsWith('text/x-component');
  if (!isPage || !cache.includes('stale-while-revalidate')) return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch: freshPages,
  async scheduled(event, env, ctx) {
    const path = CRON_ROUTES[event.cron];
    if (!path) return;
    const base = env.SITE_URL || 'https://anyfreebook.com';
    const headers = env.CRON_SECRET ? { authorization: `Bearer ${env.CRON_SECRET}` } : {};
    // Call our own route inside the same Worker (no network hop)
    ctx.waitUntil(worker.fetch(new Request(base + path, { headers }), env, ctx));
  },
};
