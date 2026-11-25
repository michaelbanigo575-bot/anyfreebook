import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Sponsor } from '@/lib/sponsors/types';

export const dynamic = 'force-dynamic';

/** The sponsor currently showing in each spot (last saved wins). Public, read-only. */
export async function GET() {
  const spots: Partial<Record<Sponsor['placement'], Sponsor>> = {};
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('sponsors')
      .select('id, placement, sponsor_name, headline, body, link_url, cta_label, media_type, media_url, extra_links, active, starts_at, ends_at')
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(50);
    const now = Date.now();
    for (const s of (data || []) as Sponsor[]) {
      if (s.starts_at && Date.parse(s.starts_at) > now) continue;
      if (s.ends_at && Date.parse(s.ends_at) <= now) continue;
      spots[s.placement] ??= s;
    }
  } catch { /* table not created yet or database down: the homepage simply shows no sponsors */ }
  return NextResponse.json({ spots }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
