import { createServiceClient } from '@/lib/supabase/server';
import { Panel, Stat, StatusPill, relTime } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getReferralData() {
  try {
    const sb = createServiceClient();
    const { data: referrals } = await sb
      .from('referrals')
      .select('id, referrer_id, referred_email, status, points_awarded, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: topReferrers } = await sb.rpc('get_top_referrers').catch(() => ({ data: null }));

    // Fallback if the RPC doesn't exist: manual aggregation
    let leaders: { referrer_id: string; count: number; email?: string }[] = topReferrers as never;
    if (!leaders) {
      const { data: all } = await sb.from('referrals').select('referrer_id').eq('status', 'signed_up');
      const map = new Map<string, number>();
      for (const r of (all || []) as { referrer_id: string }[]) {
        map.set(r.referrer_id, (map.get(r.referrer_id) || 0) + 1);
      }
      leaders = Array.from(map.entries()).map(([id, count]) => ({ referrer_id: id, count })).sort((a, b) => b.count - a.count).slice(0, 10);

      if (leaders.length > 0) {
        const { data: profs } = await sb.from('profiles').select('id, email').in('id', leaders.map(l => l.referrer_id));
        const emailMap = new Map((profs as { id: string; email: string }[] || []).map((p): [string, string] => [p.id, p.email]));
        leaders = leaders.map(l => ({ ...l, email: emailMap.get(l.referrer_id) }));
      }
    }

    return { referrals: (referrals as { id: string; referrer_id: string; referred_email: string | null; status: string; points_awarded: number; created_at: string }[]) || [], leaders };
  } catch {
    return { referrals: [], leaders: [] };
  }
}

export default async function ReferralsPage() {
  const { referrals, leaders } = await getReferralData();

  const total = referrals.length;
  const signedUp = referrals.filter(r => r.status === 'signed_up' || r.status === 'rewarded').length;
  const rewarded = referrals.filter(r => r.status === 'rewarded').length;
  const conversion = total > 0 ? Math.round((signedUp / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total referrals" value={total} />
        <Stat label="Converted" value={signedUp} tone="good" />
        <Stat label="Rewarded" value={rewarded} sub="reached tier bonus" />
        <Stat label="Conversion" value={`${conversion}%`} tone={conversion > 50 ? 'good' : 'warn'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Top referrers">
          {leaders.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">No referrers yet. Share your referral link to seed the leaderboard.</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {leaders.map((l, i) => (
                <div key={l.referrer_id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-300' : i === 1 ? 'bg-slate-500/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-300' : 'bg-slate-800 text-slate-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-white truncate">{l.email || l.referrer_id.slice(0, 12) + '…'}</div>
                  <div className="text-sm font-mono text-white">{l.count}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent referrals">
          {referrals.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">No referrals recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/70 max-h-[420px] overflow-y-auto">
              {referrals.slice(0, 15).map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                  <StatusPill
                    status={r.status === 'rewarded' ? 'ok' : r.status === 'signed_up' ? 'ok' : 'neutral'}
                    label={r.status.replace('_', ' ').toUpperCase()}
                  />
                  <div className="flex-1 min-w-0 text-sm text-white truncate">{r.referred_email || '—'}</div>
                  <div className="text-[11px] text-slate-500">{relTime(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
