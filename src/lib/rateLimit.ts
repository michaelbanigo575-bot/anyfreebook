/**
 * Minimal in-memory sliding-window rate limiter for API routes.
 * Per serverless instance (resets on cold start) — a deterrent against
 * casual abuse and runaway loops, not a distributed quota system.
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  let hits = buckets.get(key);
  if (!hits) {
    if (buckets.size >= MAX_KEYS) evictStale(cutoff);
    // Still full after stale eviction — the map is holding keys inside the
    // current window. Drop the oldest key rather than clearing EVERY bucket:
    // wiping the whole map let one burst of distinct IPs reset all rate
    // limiting for every other user on this instance.
    if (buckets.size >= MAX_KEYS) {
      const oldest = buckets.keys().next();
      if (!oldest.done) buckets.delete(oldest.value);
    }
    hits = [];
    buckets.set(key, hits);
  }
  while (hits.length && hits[0] < cutoff) hits.shift();
  if (hits.length >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((hits[0] + windowMs - now) / 1000) };
  }
  hits.push(now);
  return { ok: true, retryAfterSec: 0 };
}

/** Drop buckets whose entire window has already expired. */
function evictStale(cutoff: number) {
  // Array.from (not for..of over a Map) — see the downlevelIteration note in
  // tsconfig: the compile target predates iterable Map destructuring.
  Array.from(buckets.entries()).forEach(entry => {
    const key = entry[0];
    const hits = entry[1];
    if (hits.length === 0 || hits[hits.length - 1] < cutoff) buckets.delete(key);
  });
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim()
    || headers.get('x-real-ip')
    || 'unknown';
}
