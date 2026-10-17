import { checkAllRoutes, checkAllApis, getDbHealth } from '@/lib/admin/siteHealth';
import { Panel, StatusPill, Stat, relTime } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HealthPage() {
  const [routes, apis, db] = await Promise.all([checkAllRoutes(), checkAllApis(), getDbHealth()]);
  const ok = routes.filter(r => r.status === 'ok').length;
  const worst = routes.reduce((max, r) => Math.max(max, r.latencyMs), 0);
  const avg = Math.round(routes.reduce((a, r) => a + r.latencyMs, 0) / routes.length);
  const apisOk = apis.filter(a => a.status === 'ok').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Routes healthy" value={`${ok}/${routes.length}`} tone={ok === routes.length ? 'good' : ok > routes.length / 2 ? 'warn' : 'bad'} />
        <Stat label="APIs healthy" value={`${apisOk}/${apis.length}`} tone={apisOk === apis.length ? 'good' : apisOk > apis.length / 2 ? 'warn' : 'bad'} />
        <Stat label="Avg latency" value={`${avg}ms`} tone={avg < 1000 ? 'good' : avg < 3000 ? 'warn' : 'bad'} />
        <Stat label="Down" value={routes.filter(r => r.status === 'down').length} tone={routes.filter(r => r.status === 'down').length === 0 ? 'good' : 'bad'} />
      </div>

      <Panel title="Route status">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 border-b border-slate-800/70 text-left">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Route</th>
                <th className="px-5 py-3 font-semibold">Path</th>
                <th className="px-5 py-3 font-semibold text-right">HTTP</th>
                <th className="px-5 py-3 font-semibold text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {routes.map(r => (
                <tr key={r.path}>
                  <td className="px-5 py-3"><StatusPill status={r.status === 'ok' ? 'ok' : r.status === 'degraded' ? 'warn' : 'error'} label={r.status.toUpperCase()} /></td>
                  <td className="px-5 py-3 text-white font-medium">{r.label}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-[12px]">{r.path}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{r.statusCode || '—'}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{r.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="API & backend jobs">
        <div className="divide-y divide-slate-800/70">
          {apis.map(a => (
            <div key={a.id} className="px-5 py-3 flex items-center gap-3">
              <StatusPill status={a.status === 'ok' ? 'ok' : a.status === 'degraded' ? 'warn' : 'error'} label={a.status.toUpperCase()} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{a.label}</div>
                <div className="text-[11px] text-slate-500 truncate">{a.detail}</div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">{a.latencyMs}ms</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Database health" action={!db.connected ? <span className="text-[10px] text-rose-400">{db.hint}</span> : undefined}>
        {db.connected ? (
          <>
            <div className="grid grid-cols-3 divide-x divide-slate-800/70 border-b border-slate-800/70">
              <div className="px-5 py-4">
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Stale live classrooms</div>
                <div className={`mt-1 text-xl font-bold font-mono ${db.staleClassrooms > 0 ? 'text-amber-300' : 'text-white'}`}>{db.staleClassrooms}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">status=live &gt; 6h — cron should end these</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Translation cache rows</div>
                <div className="mt-1 text-xl font-bold font-mono text-white">{db.translationCacheRows.toLocaleString()}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">cached translated strings</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Client errors (24h)</div>
                <div className={`mt-1 text-xl font-bold font-mono ${db.clientErrors24h > 20 ? 'text-rose-300' : db.clientErrors24h > 0 ? 'text-amber-300' : 'text-white'}`}>{db.clientErrors24h}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">reported from browsers</div>
              </div>
            </div>
            {db.recentErrors.length > 0 && (
              <div className="divide-y divide-slate-800/70">
                {db.recentErrors.map((e, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="text-sm text-rose-300 truncate">{e.message}</div>
                    <div className="text-[11px] text-slate-500 truncate">{e.url || '—'} · {relTime(e.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="p-5 text-sm text-slate-400">Could not reach Supabase — check service role key.</div>
        )}
      </Panel>
    </div>
  );
}
