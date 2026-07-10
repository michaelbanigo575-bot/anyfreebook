import { checkAllRoutes } from '@/lib/admin/siteHealth';
import { checkAllSources } from '@/lib/admin/sources';
import { getUserMetrics, getRecentSignups, getViewMetrics } from '@/lib/admin/metrics';
import { getGitHubSummary } from '@/lib/admin/github';
import { getVercelSummary } from '@/lib/admin/vercel';
import { getIntegrations } from '@/lib/admin/integrations';
import { Panel, Stat, StatusPill, Sparkline, relTime } from './ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminOverview() {
  const [routes, sources, metrics, github, vercel, signups, views] = await Promise.all([
    checkAllRoutes(),
    checkAllSources(),
    getUserMetrics(),
    getGitHubSummary(),
    getVercelSummary(),
    getRecentSignups(5),
    getViewMetrics(),
  ]);

  const integrations = getIntegrations(vercel.connected, github.connected);
  const overallRouteOk = routes.every(r => r.status === 'ok');
  const overallSourceOk = sources.filter(s => s.status !== 'down').length;
  const avgLatency = Math.round(routes.reduce((a, r) => a + r.latencyMs, 0) / routes.length);

  return (
    <div className="space-y-6">
      {/* Top row: key stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Site status"
          value={overallRouteOk ? 'Healthy' : 'Degraded'}
          sub={`${routes.filter(r => r.status === 'ok').length}/${routes.length} routes · ${avgLatency}ms avg`}
          tone={overallRouteOk ? 'good' : 'warn'}
        />
        <Stat
          label="Book sources"
          value={`${overallSourceOk}/${sources.length}`}
          sub={`${sources.filter(s => s.status === 'ok').length} healthy · ${sources.filter(s => s.status === 'degraded').length} degraded · ${sources.filter(s => s.status === 'down').length} down`}
          tone={overallSourceOk === sources.length ? 'good' : overallSourceOk >= sources.length - 1 ? 'warn' : 'bad'}
        />
        <Stat
          label="Total users"
          value={metrics.totalUsers.toLocaleString()}
          sub={metrics.connected ? `${metrics.newToday} today · ${metrics.newThisWeek} this week` : (metrics.hint || 'Supabase offline')}
          tone={metrics.connected ? 'default' : 'bad'}
        />
        <Stat
          label="Latest deploy"
          value={vercel.latestProduction ? (vercel.latestProduction.state === 'READY' ? 'Ready' : vercel.latestProduction.state) : github.commits[0] ? 'GitHub only' : '—'}
          sub={vercel.latestProduction ? relTime(vercel.latestProduction.createdAt) : github.commits[0] ? `commit ${github.commits[0].sha} · ${relTime(github.commits[0].date)}` : 'no data'}
          tone={vercel.errorCount24h > 0 ? 'warn' : 'good'}
        />
      </div>

      {/* Middle row: site routes + sources */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Live route checks" action={<span className="text-[10px] text-slate-500">production {process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'anyfreebook.com'}</span>}>
          <div className="divide-y divide-slate-800/70">
            {routes.map(r => (
              <div key={r.path} className="px-5 py-3 flex items-center gap-3">
                <StatusPill status={r.status === 'ok' ? 'ok' : r.status === 'degraded' ? 'warn' : 'error'} label={r.status.toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{r.label}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{r.path}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-300">{r.statusCode || '—'}</div>
                  <div className="text-[11px] text-slate-500">{r.latencyMs}ms</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Book source health" action={<span className="text-[10px] text-slate-500">live probes</span>}>
          <div className="divide-y divide-slate-800/70">
            {sources.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                <StatusPill status={s.status === 'ok' ? 'ok' : s.status === 'degraded' ? 'warn' : 'error'} label={s.status.toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{s.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {s.totalReported > 0 ? `${s.totalReported.toLocaleString()} results indexed` : (s.error || 'no results returned')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-300">{s.resultCount}</div>
                  <div className="text-[11px] text-slate-500">{s.latencyMs}ms</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Content views — daily / weekly / monthly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Views today" value={views.today.toLocaleString()} tone="good" />
        <Stat label="Views yesterday" value={views.yesterday.toLocaleString()} />
        <Stat label="Views — 7 days" value={views.last7Days.toLocaleString()} />
        <Stat label="Views — 30 days" value={views.last30Days.toLocaleString()} sub={views.connected ? undefined : 'view_events table not found — run migration 005'} tone={views.connected ? 'default' : 'warn'} />
      </div>

      <Panel title="Content views trend — last 30 days">
        <div className="p-5">
          <Sparkline values={views.dailySeries.map(d => d.count)} height={90} color="#34d399" />
          <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
            <span>{views.dailySeries[0]?.day.slice(5) || '—'}</span>
            <span>{views.dailySeries[views.dailySeries.length - 1]?.day.slice(5) || '—'}</span>
          </div>
        </div>
      </Panel>

      {/* User growth + interactions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Signups — last 30 days" className="lg:col-span-2">
          <div className="p-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-3xl font-bold font-mono text-white">
                  {metrics.signupSeries.reduce((a, s) => a + s.count, 0)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">signups this month</div>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <div className="text-lg font-mono font-semibold text-emerald-400">{metrics.newToday}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Today</div>
                </div>
                <div>
                  <div className="text-lg font-mono font-semibold text-slate-300">{metrics.newThisWeek}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Week</div>
                </div>
              </div>
            </div>
            <Sparkline values={metrics.signupSeries.map(s => s.count)} height={100} color="#818cf8" />
            <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{metrics.signupSeries[0]?.day.slice(5)}</span>
              <span>{metrics.signupSeries[metrics.signupSeries.length - 1]?.day.slice(5)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Engagement">
          <div className="divide-y divide-slate-800/70">
            <MiniRow label="Book interactions" value={metrics.totalInteractions.toLocaleString()} />
            <MiniRow label="Active study plans" value={metrics.activeStudyPlans.toLocaleString()} />
            <MiniRow label="Collections" value={`${metrics.totalCollections} (${metrics.publicCollections} public)`} />
            <MiniRow label="Confirmed referrals" value={metrics.totalReferrals.toLocaleString()} />
            <MiniRow label="Premium users" value={metrics.premiumUsers.toLocaleString()} />
          </div>
        </Panel>
      </div>

      {/* Recent commits + integrations */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Recent commits" className="lg:col-span-2" action={<a href={`https://github.com/${process.env.GITHUB_REPO || 'michaelbanigo575-bot/anyfreebook'}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-400 hover:underline">Open repo →</a>}>
          {github.connected ? (
            <div className="divide-y divide-slate-800/70">
              {github.commits.slice(0, 6).map(c => (
                <a
                  key={c.sha}
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                      {c.authorAvatar && <img src={c.authorAvatar} alt={c.authorName} className="w-full h-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{c.message}</div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono">{c.sha}</span> · {c.authorName} · {relTime(c.date)}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-slate-400">{github.hint || 'GitHub API unavailable'}</div>
          )}
        </Panel>

        <Panel title="Integrations">
          <div className="divide-y divide-slate-800/70">
            {integrations.slice(0, 6).map(i => (
              <div key={i.id} className="px-5 py-3 flex items-center gap-3">
                <div className="text-lg">{i.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{i.name}</div>
                </div>
                <StatusPill
                  status={i.status === 'connected' ? 'ok' : i.status === 'partial' ? 'warn' : 'neutral'}
                  label={i.status === 'connected' ? 'ON' : i.status === 'partial' ? 'PART' : 'OFF'}
                />
              </div>
            ))}
          </div>
          <div className="p-3 text-center">
            <a href="/admin/integrations" className="text-[11px] text-indigo-400 hover:underline">View all integrations →</a>
          </div>
        </Panel>
      </div>

      {/* Recent signups + Deployments */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Recent signups" action={<a href="/admin/users" className="text-[11px] text-indigo-400 hover:underline">All users →</a>}>
          {signups.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">No signups yet. Share your referral link to get the first one.</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {signups.map((s, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {(s.display_name || s.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{s.display_name || s.email?.split('@')[0]}</div>
                    <div className="text-[11px] text-slate-500 truncate">{s.email}</div>
                  </div>
                  <div className="text-[11px] text-slate-500">{relTime(s.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent deployments" action={<a href="/admin/deployments" className="text-[11px] text-indigo-400 hover:underline">All deploys →</a>}>
          {!vercel.connected ? (
            <div className="p-5 text-sm text-slate-400">
              {vercel.hint || 'Vercel API not connected.'}
              <a href="/admin/integrations" className="text-indigo-400 hover:underline ml-1">Connect →</a>
            </div>
          ) : vercel.recent.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">No deployments yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {vercel.recent.slice(0, 5).map(d => (
                <a
                  key={d.uid}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusPill
                      status={d.state === 'READY' ? 'ok' : d.state === 'BUILDING' || d.state === 'QUEUED' ? 'warn' : d.state === 'ERROR' ? 'error' : 'neutral'}
                      label={d.state}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{d.commitMsg || d.url.replace(/^https?:\/\//, '')}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.target || 'preview'} · {d.branch || '—'} · {relTime(d.createdAt)}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-mono font-semibold text-white">{value}</span>
    </div>
  );
}
