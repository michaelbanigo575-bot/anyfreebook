import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Scheduled cleanup (vercel.json cron): ends any class still marked 'live'
 * that is 6+ hours past its planned end — the server-side backstop to the
 * lazy on-view cleanup in lib/classrooms/server.
 */
export async function GET(request: NextRequest) {
  // Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env var is set
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sb = createServiceClient();
    const { data: liveRows } = await sb
      .from('classrooms')
      .select('id, scheduled_at, started_at, duration_min')
      .eq('status', 'live');

    const now = Date.now();
    const staleIds = (liveRows || [])
      .filter((c: { scheduled_at: string; started_at: string | null; duration_min: number | null }) => {
        const startedAt = new Date(c.started_at || c.scheduled_at).getTime();
        return now > startedAt + ((c.duration_min || 60) + 360) * 60 * 1000;
      })
      .map((c: { id: string }) => c.id);

    if (staleIds.length) {
      await sb.from('classrooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .in('id', staleIds);
    }

    return NextResponse.json({ checked: liveRows?.length || 0, ended: staleIds.length });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
