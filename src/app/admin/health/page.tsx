import { checkAllRoutes } from '@/lib/admin/siteHealth';
import { Panel, StatusPill, Stat } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HealthPage() {
  const routes = await checkAllRoutes();
  const ok = routes.filter(r => r.status === 'ok').length;
  const worst = routes.reduce((max, r) => Math.max(max, r.latencyMs), 0);
  const avg = Math.round(routes.reduce((a, r) => a + r.latencyMs, 0) / routes.length);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Routes healthy" value={`${ok}/${routes.length}`} tone={ok === routes.length ? 'good' : ok > routes.length / 2 ? 'warn' : 'bad'} />
        <Stat label="Avg latency" value={`${avg}ms`} tone={avg < 1000 ? 'good' : avg < 3000 ? 'warn' : 'bad'} />
        <Stat label="Slowest" value={`${worst}ms`} tone={worst < 2000 ? 'good' : worst < 5000 ? 'warn' : 'bad'} />
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
    </div>
  );
}
