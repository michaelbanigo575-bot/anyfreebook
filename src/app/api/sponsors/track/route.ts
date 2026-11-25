import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimitEdge, clientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Counts one view or click. Stores no visitor details. */
export async function POST(request: NextRequest) {
  // Limits how fast one visitor can inflate a sponsor's numbers
  const rl = await rateLimitEdge(`spon:${clientIp(request.headers)}`, 30, 60_000);
  if (!rl.ok) return new NextResponse(null, { status: 429 });

  const { id, event } = await request.json().catch(() => ({}));
  if (typeof id !== 'string' || !UUID.test(id) || (event !== 'view' && event !== 'click')) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    await createServiceClient().rpc('track_sponsor', { p_id: id, p_event: event });
  } catch { /* counting must never affect the reader */ }
  return new NextResponse(null, { status: 204 });
}
