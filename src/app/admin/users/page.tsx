import { getUserMetrics, getRecentSignups, getViewMetrics } from '@/lib/admin/metrics';
import { Panel, Stat, Sparkline, relTime } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function UsersPage() {
  const [metrics, signups, views] = await Promise.all([getUserMetrics(), getRecentSignups(30), getViewMetrics()]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total users" value={metrics.totalUsers.toLocaleString()} sub={`${metrics.newToday} today`} tone="good" />
        <Stat label="This week" value={metrics.newThisWeek.toLocaleString()} tone={metrics.newThisWeek > 0 ? 'good' : 'warn'} />
        <Stat label="Interactions" value={metrics.totalInteractions.toLocaleString()} sub={Object.entries(metrics.interactionsByType).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'none yet'} />
        <Stat label="Premium" value={metrics.premiumUsers.toLocaleString()} tone={metrics.premiumUsers > 0 ? 'good' : 'default'} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Content views today" value={views.today.toLocaleString()} tone="good" />
        <Stat label="Views this week" value={views.last7Days.toLocaleString()} />
        <Stat label="Views this month" value={views.last30Days.toLocaleString()} />
      </div>

      <Panel title="Signup trend — last 30 days">
        <div className="p-5">
          <Sparkline values={metrics.signupSeries.map(s => s.count)} height={120} color="#a78bfa" />
          <div className="mt-3 flex justify-between text-[11px] text-slate-500 font-mono">
            <span>{metrics.signupSeries[0]?.day || '—'}</span>
            <span>{metrics.signupSeries[metrics.signupSeries.length - 1]?.day || '—'}</span>
          </div>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Interaction breakdown" className="lg:col-span-1">
          <div className="p-5 space-y-3">
            {Object.entries(metrics.interactionsByType).length === 0 ? (
              <p className="text-sm text-slate-400">No interactions logged yet.</p>
            ) : (
              Object.entries(metrics.interactionsByType).map(([action, count]) => {
                const pct = Math.round((count / metrics.totalInteractions) * 100);
                return (
                  <div key={action}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 capitalize">{action}</span>
                      <span className="text-slate-500 font-mono">{count.toLocaleString()} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel title="Growth features" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-px bg-slate-800/50">
            <div className="p-5 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Study plans</div>
              <div className="text-2xl font-bold text-white mt-1">{metrics.activeStudyPlans}</div>
              <div className="text-xs text-slate-400 mt-1">active reminders</div>
            </div>
            <div className="p-5 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Collections</div>
              <div className="text-2xl font-bold text-white mt-1">{metrics.totalCollections}</div>
              <div className="text-xs text-slate-400 mt-1">{metrics.publicCollections} shareable</div>
            </div>
            <div className="p-5 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Referrals</div>
              <div className="text-2xl font-bold text-white mt-1">{metrics.totalReferrals}</div>
              <div className="text-xs text-slate-400 mt-1">confirmed conversions</div>
            </div>
            <div className="p-5 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Signups this month</div>
              <div className="text-2xl font-bold text-white mt-1">{metrics.signupSeries.reduce((a, s) => a + s.count, 0)}</div>
              <div className="text-xs text-slate-400 mt-1">rolling 30-day</div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Latest signups">
        {signups.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No signups yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/40 border-b border-slate-800/70 text-left">
                <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {signups.map((s, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {(s.display_name || s.email || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-white">{s.display_name || s.email?.split('@')[0]}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-[12px]">{s.email}</td>
                    <td className="px-5 py-3 text-right text-slate-400 text-[11px]">{relTime(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
