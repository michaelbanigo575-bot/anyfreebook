import { checkAllSources } from '@/lib/admin/sources';
import { Panel, StatusPill, Stat } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SourcesPage() {
  const sources = await checkAllSources();
  const totalIndexed = sources.reduce((a, s) => a + s.totalReported, 0);
  const healthy = sources.filter(s => s.status === 'ok').length;
  const down = sources.filter(s => s.status === 'down').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total sources" value={sources.length} />
        <Stat label="Healthy" value={healthy} tone={healthy === sources.length ? 'good' : 'warn'} />
        <Stat label="Down" value={down} tone={down === 0 ? 'good' : 'bad'} />
        <Stat label="Books indexed" value={totalIndexed.toLocaleString()} sub="across live external APIs" tone="good" />
      </div>

      <Panel title="Live source probes" action={<span className="text-[10px] text-slate-500">query: &ldquo;test&rdquo;</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 border-b border-slate-800/70 text-left">
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold text-right">Results</th>
                <th className="px-5 py-3 font-semibold text-right">Total indexed</th>
                <th className="px-5 py-3 font-semibold text-right">Latency</th>
                <th className="px-5 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {sources.map(s => (
                <tr key={s.id}>
                  <td className="px-5 py-3"><StatusPill status={s.status === 'ok' ? 'ok' : s.status === 'degraded' ? 'warn' : 'error'} label={s.status.toUpperCase()} /></td>
                  <td className="px-5 py-3 text-white font-medium">{s.name}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{s.resultCount}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{s.totalReported.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{s.latencyMs}ms</td>
                  <td className="px-5 py-3 text-[11px] text-slate-500 truncate max-w-[280px]">{s.error || (s.status === 'ok' ? 'nominal' : s.status === 'degraded' ? 'slow or no results' : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Source configuration">
        <div className="p-5 space-y-2 text-sm text-slate-400">
          <p><span className="text-white font-semibold">Aggregation:</span> Live requests to 6 external sources on every search — no scraping, no ToS violations.</p>
          <p><span className="text-white font-semibold">Fallback:</span> Project Gutenberg (blocked at Vercel IPs) is auto-served via the Internet Archive mirror of the Gutenberg collection.</p>
          <p><span className="text-white font-semibold">Caching:</span> Results cached for 1 hour per unique query at the fetch layer.</p>
        </div>
      </Panel>
    </div>
  );
}
