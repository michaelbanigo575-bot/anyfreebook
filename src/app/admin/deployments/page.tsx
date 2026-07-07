import { getVercelSummary } from '@/lib/admin/vercel';
import { Panel, Stat, StatusPill, relTime } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DeploymentsPage() {
  const v = await getVercelSummary();

  if (!v.connected) {
    return (
      <div className="space-y-6">
        <Panel title="Connect Vercel">
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-400">{v.hint || 'Vercel API is not connected.'}</p>
            <div className="text-sm text-slate-300 space-y-2">
              <p>To monitor deployments live:</p>
              <ol className="list-decimal ml-5 space-y-1 text-slate-400">
                <li>Go to <a className="text-indigo-400 hover:underline" href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer">vercel.com/account/tokens</a> and create a token scoped to this project.</li>
                <li>In Vercel project settings, add <code className="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 text-[11px]">VERCEL_API_TOKEN</code> as an env var (all environments).</li>
                <li>Redeploy — the dashboard picks up the token automatically.</li>
              </ol>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const production = v.recent.filter(d => d.target === 'production');
  const previews = v.recent.filter(d => d.target !== 'production');
  const errorRate = v.recent.length > 0 ? Math.round((v.recent.filter(d => d.state === 'ERROR').length / v.recent.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Recent deploys" value={v.recent.length} />
        <Stat label="Production" value={production.length} />
        <Stat label="Errors 24h" value={v.errorCount24h} tone={v.errorCount24h === 0 ? 'good' : 'bad'} />
        <Stat label="Error rate" value={`${errorRate}%`} tone={errorRate === 0 ? 'good' : errorRate < 20 ? 'warn' : 'bad'} />
      </div>

      <Panel title="Latest production deploy">
        {v.latestProduction ? (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <StatusPill status={v.latestProduction.state === 'READY' ? 'ok' : 'warn'} label={v.latestProduction.state} />
              <a href={v.latestProduction.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline font-mono truncate">{v.latestProduction.url.replace(/^https?:\/\//, '')}</a>
            </div>
            <div className="text-sm text-slate-300">{v.latestProduction.commitMsg || '—'}</div>
            <div className="text-[11px] text-slate-500 font-mono">
              {v.latestProduction.commitSha} · {v.latestProduction.branch || 'main'} · {v.latestProduction.authorUsername || '—'} · {relTime(v.latestProduction.createdAt)}
            </div>
          </div>
        ) : (
          <div className="p-5 text-sm text-slate-400">No production deployment yet.</div>
        )}
      </Panel>

      <Panel title="All recent deployments">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 border-b border-slate-800/70 text-left">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Env</th>
                <th className="px-5 py-3 font-semibold">Commit</th>
                <th className="px-5 py-3 font-semibold">Branch</th>
                <th className="px-5 py-3 font-semibold text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {v.recent.map(d => (
                <tr key={d.uid} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3"><StatusPill status={d.state === 'READY' ? 'ok' : d.state === 'BUILDING' || d.state === 'QUEUED' ? 'warn' : d.state === 'ERROR' ? 'error' : 'neutral'} label={d.state} /></td>
                  <td className="px-5 py-3 text-slate-300">{d.target || 'preview'}</td>
                  <td className="px-5 py-3">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-indigo-400 truncate max-w-[320px] block">{d.commitMsg || d.url.replace(/^https?:\/\//, '')}</a>
                    <div className="text-[11px] text-slate-500 font-mono">{d.commitSha}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-[12px]">{d.branch || '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-400 text-[11px]">{relTime(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
