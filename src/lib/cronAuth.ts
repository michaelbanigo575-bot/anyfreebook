import type { NextRequest } from 'next/server';

/** Fails closed: if CRON_SECRET is unset, nobody is authorized. */
export function cronAuthorized(request: NextRequest | Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
