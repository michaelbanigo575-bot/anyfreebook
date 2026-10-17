import { createServiceClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://anyfreebook.com';

const ROUTES = [
  { path: '/', label: 'Homepage' },
  { path: '/search', label: 'Search' },
  { path: '/sitemap.xml', label: 'Sitemap' },
  { path: '/robots.txt', label: 'Robots' },
  { path: '/ads.txt', label: 'AdSense ads.txt' },
  { path: '/llms.txt', label: 'llms.txt' },
  { path: '/feed.xml', label: 'RSS feed' },
  { path: '/book/clean-code', label: 'Book detail' },
  { path: '/blog', label: 'Blog index' },
  { path: '/faq', label: 'FAQ' },
  { path: '/classrooms', label: 'Classrooms' },
  { path: '/creators', label: 'Creators' },
  { path: '/rewards', label: 'Rewards' },
];

export interface RouteHealth {
  path: string;
  label: string;
  status: 'ok' | 'degraded' | 'down';
  statusCode: number;
  latencyMs: number;
}

async function checkRoute(entry: typeof ROUTES[number]): Promise<RouteHealth> {
  const start = Date.now();
  try {
    const res = await fetch(`${SITE_URL}${entry.path}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
      headers: { 'user-agent': 'ANYFREEBOOK-admin-healthcheck' },
    });
    const latency = Date.now() - start;
    const status: RouteHealth['status'] = res.ok
      ? latency > 3000 ? 'degraded' : 'ok'
      : res.status >= 500 ? 'down' : 'degraded';
    return { path: entry.path, label: entry.label, status, statusCode: res.status, latencyMs: latency };
  } catch {
    return { path: entry.path, label: entry.label, status: 'down', statusCode: 0, latencyMs: Date.now() - start };
  }
}

export async function checkAllRoutes(): Promise<RouteHealth[]> {
  return Promise.all(ROUTES.map(checkRoute));
}

export interface ApiHealth {
  id: string;
  label: string;
  status: 'ok' | 'degraded' | 'down';
  detail: string;
  latencyMs: number;
}

async function checkApi(id: string, label: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<ApiHealth> {
  const start = Date.now();
  try {
    const { ok, detail } = await fn();
    return { id, label, status: ok ? 'ok' : 'degraded', detail, latencyMs: Date.now() - start };
  } catch (err) {
    return { id, label, status: 'down', detail: err instanceof Error ? err.message : 'Request failed', latencyMs: Date.now() - start };
  }
}

export async function checkAllApis(): Promise<ApiHealth[]> {
  return Promise.all([
    checkApi('rtc-ice', 'Classroom TURN relay', async () => {
      const res = await fetch(`${SITE_URL}/api/rtc-ice`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      const relay = !!json?.relay;
      return { ok: res.ok && relay, detail: relay ? 'TURN relay configured' : 'No TURN relay — cross-network video may fail' };
    }),
    checkApi('translate', 'Translation API', async () => {
      const res = await fetch(`${SITE_URL}/api/translate`, {
        method: 'POST', signal: AbortSignal.timeout(8000), cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: ['ok'], to: 'fr' }),
      });
      return { ok: res.ok, detail: res.ok ? 'Responding' : `HTTP ${res.status}` };
    }),
    checkApi('convert-to-pdf', 'Office→PDF conversion', async () => {
      const res = await fetch(`${SITE_URL}/api/convert-to-pdf`, {
        method: 'POST', signal: AbortSignal.timeout(8000), cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/x.docx' }),
      });
      if (res.status === 501) return { ok: false, detail: 'CLOUDCONVERT_API_KEY not set' };
      if (res.status === 403) return { ok: true, detail: 'Configured — rejected non-owned test URL as expected' };
      return { ok: res.ok, detail: `HTTP ${res.status}` };
    }),
    checkApi('daily-distribution', 'Daily distribution cron', async () => {
      const res = await fetch(`${SITE_URL}/api/cron/daily-distribution`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      return { ok: res.ok, detail: res.ok ? 'Responding' : `HTTP ${res.status}` };
    }),
    checkApi('end-stale-classes', 'Stale classroom cleanup cron', async () => {
      const res = await fetch(`${SITE_URL}/api/cron/end-stale-classes`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      return { ok: res.ok, detail: res.ok ? 'Responding' : `HTTP ${res.status}` };
    }),
  ]);
}

export interface DbHealth {
  connected: boolean;
  staleClassrooms: number;
  translationCacheRows: number;
  clientErrors24h: number;
  recentErrors: { message: string; url: string | null; created_at: string }[];
  hint?: string;
}

export async function getDbHealth(): Promise<DbHealth> {
  try {
    const sb = createServiceClient();
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [stale, cacheCount, errorCount, recentErrors] = await Promise.all([
      sb.from('classrooms').select('id', { count: 'exact', head: true }).eq('status', 'live').lt('started_at', sixHoursAgo),
      sb.from('translation_cache').select('lang', { count: 'exact', head: true }),
      sb.from('client_errors').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
      sb.from('client_errors').select('message, url, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    return {
      connected: true,
      staleClassrooms: stale.count || 0,
      translationCacheRows: cacheCount.count || 0,
      clientErrors24h: errorCount.count || 0,
      recentErrors: (recentErrors.data as DbHealth['recentErrors']) || [],
    };
  } catch (err) {
    return {
      connected: false, staleClassrooms: 0, translationCacheRows: 0, clientErrors24h: 0, recentErrors: [],
      hint: err instanceof Error ? err.message : 'Supabase service query failed',
    };
  }
}
