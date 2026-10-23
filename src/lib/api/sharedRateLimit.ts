import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit as memoryRateLimit } from '@/lib/rateLimit';

/**
 * A rate limit that is shared across every serverless instance.
 *
 * The in-memory limiter in src/lib/rateLimit.ts resets on each cold start and
 * lives on one instance, so it cannot cap a public API: a caller simply gets a
 * fresh bucket on the next instance. This one keeps the counters in Postgres,
 * so the limit is the same limit for everybody.
 *
 * It needs the `api_rate_limit_hit` function from
 * supabase/migrations/20261023000000_public_api.sql. Until that migration is
 * applied the call fails, and we fall back to the in-memory limiter so the
 * API keeps working (with per-instance limits) instead of breaking outright.
 */

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
  /** 'shared' = the Postgres-backed counter; 'memory' = the per-instance fallback. */
  scope: 'shared' | 'memory';
}

let warnedAboutFallback = false;

function warnOnce(reason: string) {
  if (warnedAboutFallback) return;
  warnedAboutFallback = true;
  console.warn(
    `[api] shared rate limit unavailable (${reason}) — falling back to the per-instance limiter. ` +
      'Apply supabase/migrations/20261023000000_public_api.sql to make the quota real.'
  );
}

async function hitShared(
  bucket: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retry_after_sec: number } | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('api_rate_limit_hit', {
      p_bucket: bucket,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) {
      warnOnce(error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.allowed !== 'boolean') {
      warnOnce('unexpected response');
      return null;
    }
    return { allowed: row.allowed, retry_after_sec: Number(row.retry_after_sec) || 0 };
  } catch (err) {
    warnOnce(err instanceof Error ? err.message : 'unknown error');
    return null;
  }
}

/**
 * Counts one hit against `bucket` and reports whether the caller is still
 * inside the limit.
 */
export async function sharedRateLimit(
  bucket: string,
  limit: number,
  windowMs: number
): Promise<RateResult> {
  const shared = await hitShared(bucket, limit, windowMs);
  if (shared) {
    return {
      ok: shared.allowed,
      retryAfterSec: shared.retry_after_sec,
      scope: 'shared',
    };
  }
  const fallback = memoryRateLimit(bucket, limit, windowMs);
  return { ok: fallback.ok, retryAfterSec: fallback.retryAfterSec, scope: 'memory' };
}

/**
 * Applies a per-minute limit and (optionally) a per-day limit.
 * The two windows are counted in parallel, so the cost is one round trip.
 */
export async function sharedRateLimitBoth(
  bucket: string,
  perMinute: number,
  perDay: number | null
): Promise<RateResult> {
  const calls: Promise<RateResult>[] = [sharedRateLimit(`${bucket}:min`, perMinute, 60_000)];
  if (perDay !== null) {
    calls.push(sharedRateLimit(`${bucket}:day`, perDay, 86_400_000));
  }

  const results = await Promise.all(calls);
  const failed = results.find(r => !r.ok);
  if (failed) {
    // The minute window is the one a client can retry quickly, so prefer it.
    const minute = results[0];
    return minute.ok ? { ...failed, retryAfterSec: Math.max(failed.retryAfterSec, minute.retryAfterSec) } : minute;
  }
  return { ok: true, retryAfterSec: 0, scope: results[0].scope };
}
