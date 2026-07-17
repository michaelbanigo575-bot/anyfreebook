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
    if (buckets.size >= MAX_KEYS) buckets.clear(); // crude memory guard
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

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim()
    || headers.get('x-real-ip')
    || 'unknown';
}
