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
    };
  }

  const limit = await sharedRateLimitBoth(`v1:${key.callerId}`, key.requestsPerMinute, key.requestsPerDay);
  if (!limit.ok) {
    return {
      key: null,
      response: withCors(
        NextResponse.json(
          { error: 'Rate limit exceeded. Slow down and retry shortly.' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
        ),
        request
      ),
    };
  }

  return { key, response: null };
}

/** A JSON response with the CORS headers attached. */
export function json(request: NextRequest, body: unknown, status = 200): NextResponse {
  return withCors(NextResponse.json(body, { status }), request);
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
