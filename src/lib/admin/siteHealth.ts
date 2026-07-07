const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://anyfreebook.com';

const ROUTES = [
  { path: '/', label: 'Homepage' },
  { path: '/search', label: 'Search' },
  { path: '/sitemap.xml', label: 'Sitemap' },
  { path: '/robots.txt', label: 'Robots' },
  { path: '/ads.txt', label: 'AdSense ads.txt' },
  { path: '/book/clean-code', label: 'Book detail' },
  { path: '/blog', label: 'Blog index' },
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
