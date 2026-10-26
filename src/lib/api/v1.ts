import { NextResponse, type NextRequest } from 'next/server';
import { resolveApiKey, type ApiKeyInfo } from '@/lib/apiKeys';
import { sharedRateLimitBoth } from './sharedRateLimit';
import { withCors, preflight } from './cors';

/**
 * Shared plumbing for the public API (/api/v1/*).
 *
 * Rules that every versioned endpoint follows:
 *  - a caller with a bad key gets 401, never a silent downgrade;
 *  - the quota is shared across instances, so it is a real quota;
 *  - errors are JSON with a stable `error` field;
 *  - CORS is closed unless the origin is on the allowlist.
 */

export const API_VERSION = 'v1';
export const API_BASE = 'https://anyfreebook.com/api/v1';

export interface GuardResult {
  key: ApiKeyInfo | null;
  response: NextResponse | null;
  /** Headers describing the quota, to be attached to every response. */
  headers: Record<string, string>;
}

/**
 * The quota headers for a request, stashed when the guard runs.
 *
 * A WeakMap keyed by the request means every response can carry the caller's
 * limit without threading it through every call site — and it disappears with
 * the request, so nothing leaks between calls.
 */
const quotaByRequest = new WeakMap<NextRequest, Record<string, string>>();

/** Describes the caller's quota.
 *
 * A developer building against a rate-limited API needs to see the limit
 * before they hit it, not after. The remaining count is not reported
 * because the counter is a rolling window rather than a bucket, and a
 * number that is wrong near the boundary is worse than no number.
 */
function quotaHeaders(key: ApiKeyInfo): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(key.requestsPerMinute),
    'X-RateLimit-Window': '60s',
    'X-RateLimit-Tier': key.tier,
  };
  if (key.requestsPerDay !== null) {
    headers['X-RateLimit-Daily-Limit'] = String(key.requestsPerDay);
  }
  return headers;
}

/** Resolves the caller and applies the quota. Returns the 401/429 response, if any. */
export async function guard(request: NextRequest): Promise<GuardResult> {
  const key = await resolveApiKey(request);

  if (key.invalidKey) {
    return {
      key: null,
      response: withCors(
        NextResponse.json(
          {
            error:
              'Invalid API key. Check the key, or omit the Authorization header to use the anonymous tier.',
          },
          { status: 401 }
        ),
        request
      ),
      headers: {},
    };
  }

  const limit = await sharedRateLimitBoth(`v1:${key.callerId}`, key.requestsPerMinute, key.requestsPerDay);
  const headers = { ...quotaHeaders(key), 'X-RateLimit-Scope': limit.scope };
  quotaByRequest.set(request, headers);

  if (!limit.ok) {
    return {
      key: null,
      response: withCors(
        NextResponse.json(
          { error: 'Rate limit exceeded. Slow down and retry shortly.' },
          { status: 429, headers: { ...headers, 'Retry-After': String(limit.retryAfterSec) } }
        ),
        request
      ),
      headers,
    };
  }

  return { key, response: null, headers };
}

/** A JSON response with the CORS headers attached. */
export function json(request: NextRequest, body: unknown, status = 200): NextResponse {
  return withCors(NextResponse.json(body, { status, headers: quotaByRequest.get(request) || {} }), request);
}

/** The envelope every v1 response carries. */
export function meta(extra: Record<string, unknown> = {}) {
  return {
    apiVersion: API_VERSION,
    generatedAt: new Date().toISOString(),
    ...extra,
  };
}

/** Answers a CORS preflight for a v1 endpoint. */
export function handlePreflight(request: NextRequest): NextResponse {
  return preflight(request);
}

export const TIERS = ['download', 'borrow', 'unverified'] as const;
export type Tier = (typeof TIERS)[number];
