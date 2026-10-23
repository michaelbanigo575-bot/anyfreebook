import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { clientIp } from '@/lib/rateLimit';

/**
 * API keys for the public API.
 *
 * A key is `afb_` followed by 40 hex characters. Only the SHA-256 hash is
 * stored, so a leaked database dump does not hand anyone a usable key.
 *
 * Keys are OPTIONAL. The anonymous tier exists so the CLI works with zero
 * setup; a key just buys a bigger quota and a named dashboard row.
 */

export type ApiTier = 'anonymous' | 'free' | 'partner';

export interface ApiKeyInfo {
  /** Stable identifier for the caller — the key id, or `ip:<address>` when anonymous. */
  callerId: string;
  tier: ApiTier;
  requestsPerMinute: number;
  requestsPerDay: number | null;
  /** True when a key was presented but could not be verified. */
  invalidKey: boolean;
  label: string;
}

const TIER_LIMITS: Record<ApiTier, { perMinute: number; perDay: number | null }> = {
  anonymous: { perMinute: 30, perDay: 200 },
  free: { perMinute: 60, perDay: 2_000 },
  partner: { perMinute: 300, perDay: 50_000 },
};

const KEY_PREFIX = 'afb_';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function isApiKeyShape(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && /^[0-9a-f]{40}$/.test(value.slice(KEY_PREFIX.length));
}

/** Reads the bearer token, if any. */
export function readBearerKey(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Resolves the caller.
 *
 * A key that cannot be verified is NEVER silently downgraded to the anonymous
 * tier — that would hide a typo or a revoked key behind a working request.
 * It comes back as `invalidKey: true` and the route answers 401.
 */
export async function resolveApiKey(request: NextRequest): Promise<ApiKeyInfo> {
  const ip = clientIp(request.headers);
  const presented = readBearerKey(request);

  if (!presented) {
    return {
      callerId: `ip:${ip}`,
      tier: 'anonymous',
      requestsPerMinute: TIER_LIMITS.anonymous.perMinute,
      requestsPerDay: TIER_LIMITS.anonymous.perDay,
      invalidKey: false,
      label: 'anonymous',
    };
  }

  if (!isApiKeyShape(presented)) {
    return {
      callerId: `ip:${ip}`,
      tier: 'anonymous',
      requestsPerMinute: TIER_LIMITS.anonymous.perMinute,
      requestsPerDay: TIER_LIMITS.anonymous.perDay,
      invalidKey: true,
      label: 'invalid',
    };
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, tier, requests_per_minute, requests_per_day, is_active')
      .eq('key_hash', hashApiKey(presented))
      .maybeSingle();

    // The table does not exist yet (migration not applied) or the lookup
    // failed. Either way we cannot verify the key.
    if (error || !data) {
      return {
        callerId: `ip:${ip}`,
        tier: 'anonymous',
        requestsPerMinute: TIER_LIMITS.anonymous.perMinute,
        requestsPerDay: TIER_LIMITS.anonymous.perDay,
        invalidKey: true,
        label: 'unverified',
      };
    }

    if (!data.is_active) {
      return {
        callerId: `ip:${ip}`,
        tier: 'anonymous',
        requestsPerMinute: TIER_LIMITS.anonymous.perMinute,
        requestsPerDay: TIER_LIMITS.anonymous.perDay,
        invalidKey: true,
        label: 'revoked',
      };
    }

    const tier: ApiTier = data.tier === 'partner' ? 'partner' : 'free';
    const defaults = TIER_LIMITS[tier];

    // Best-effort usage stamp; a failure here must not fail the request.
    try {
      await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
    } catch {}

    return {
      callerId: `key:${data.id}`,
      tier,
      requestsPerMinute: data.requests_per_minute ?? defaults.perMinute,
      requestsPerDay: data.requests_per_day ?? defaults.perDay,
      invalidKey: false,
      label: data.label || tier,
    };
  } catch {
    return {
      callerId: `ip:${ip}`,
      tier: 'anonymous',
      requestsPerMinute: TIER_LIMITS.anonymous.perMinute,
      requestsPerDay: TIER_LIMITS.anonymous.perDay,
      invalidKey: true,
      label: 'unverified',
    };
  }
}
