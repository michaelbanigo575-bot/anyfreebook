// Cloudflare entry: the site itself (built by OpenNext) plus the scheduled jobs
// that used to live in vercel.json.
import worker from './.open-next/worker.js';

const CRON_ROUTES = {
  '0 3 * * *': '/api/cron/end-stale-classes',
  '0 8 * * *': '/api/cron/daily-distribution',
};

export default {
  fetch: worker.fetch,
  async scheduled(event, env, ctx) {
    const path = CRON_ROUTES[event.cron];
    if (!path) return;
    const base = env.SITE_URL || 'https://anyfreebook.com';
    const headers = env.CRON_SECRET ? { authorization: `Bearer ${env.CRON_SECRET}` } : {};
    // Call our own route inside the same Worker (no network hop)
    ctx.waitUntil(worker.fetch(new Request(base + path, { headers }), env, ctx));
  },
};
