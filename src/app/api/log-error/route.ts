import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Own error monitoring: browsers report uncaught errors here → client_errors table. */
export async function POST(request: NextRequest) {
  const rl = rateLimit(`err:${clientIp(request.headers)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const { message, stack, url } = await request.json().catch(() => ({}));
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const sb = createServiceClient();
    await sb.from('client_errors').insert({
      message: message.slice(0, 500),
      stack: typeof stack === 'string' ? stack.slice(0, 3000) : null,
      url: typeof url === 'string' ? url.slice(0, 300) : null,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300),
    });
  } catch { /* table missing or DB hiccup — never break the client over logging */ }

  return NextResponse.json({ ok: true });
}
