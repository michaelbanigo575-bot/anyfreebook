import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS for the public API (/api/v1/*).
 *
 * The allowlist is deliberately closed by default. Every search fans out to as
 * many as seven third-party APIs, so an unrestricted browser origin would let
 * any page on the internet spend our upstream budget. A CLI or a server-side
 * SDK does not need CORS at all — only the embeddable widget (phase 3) does.
 *
 * Set NEXT_PUBLIC_API_ALLOWED_ORIGINS to a comma-separated list of origins to
 * allow, e.g. "https://blog.example.com,https://app.example.com".
 * The single value "*" allows any origin — only do that once the shared rate
 * limit is in place and you accept the load.
 */

const ALLOWLIST_ENV = 'NEXT_PUBLIC_API_ALLOWED_ORIGINS';

export function allowedOrigins(): string[] {
  const raw = process.env[ALLOWLIST_ENV];
  if (!raw) return [];
  return raw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
}

/** True when `origin` may call the API from a browser. */
export function originAllowed(origin: string | null): boolean {
  const list = allowedOrigins();
  if (list.length === 0) return false;
  if (list.includes('*')) return true;
  if (!origin) return false;
  return list.includes(origin);
}

/** The headers to attach to a response, given the caller's Origin. */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!originAllowed(origin)) return {};
  const list = allowedOrigins();
  const value = list.includes('*') ? '*' : origin!;
  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    // The response body varies by Origin when the allowlist is a list, so
    // caches must not serve one origin's response to another.
    Vary: 'Origin',
  };
}

/** Attaches the CORS headers (when the origin is allowed) to a JSON response. */
export function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const headers = corsHeaders(request.headers.get('origin'));
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

/** Answers a CORS preflight. 204 when the origin is allowed, 403 when it is not. */
export function preflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  if (!originAllowed(origin)) {
    return new NextResponse('Origin not allowed', { status: 403 });
  }
  const response = new NextResponse(null, { status: 204 });
  for (const [key, value] of Object.entries(corsHeaders(origin))) response.headers.set(key, value);
  return response;
}
