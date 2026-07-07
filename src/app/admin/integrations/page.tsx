import { getGitHubSummary } from '@/lib/admin/github';
import { getVercelSummary } from '@/lib/admin/vercel';
import { getIntegrations } from '@/lib/admin/integrations';
import { Panel, StatusPill } from '../ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function IntegrationsPage() {
  const [github, vercel] = await Promise.all([getGitHubSummary(), getVercelSummary()]);
  const items = getIntegrations(vercel.connected, github.connected);

  const connected = items.filter(i => i.status === 'connected').length;
  const partial = items.filter(i => i.status === 'partial').length;
  const disconnected = items.filter(i => i.status === 'disconnected').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Connected</div>
          <div className="mt-1 text-3xl font-bold text-white font-mono">{connected}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">Partial</div>
          <div className="mt-1 text-3xl font-bold text-white font-mono">{partial}</div>
        </div>
        <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-5">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Available</div>
          <div className="mt-1 text-3xl font-bold text-white font-mono">{disconnected}</div>
        </div>
      </div>

      <Panel title="All integrations">
        <div className="divide-y divide-slate-800/70">
          {items.map(i => (
            <div key={i.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-800/60 flex items-center justify-center text-xl flex-shrink-0">
                {i.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{i.name}</span>
                  <StatusPill
                    status={i.status === 'connected' ? 'ok' : i.status === 'partial' ? 'warn' : 'neutral'}
                    label={i.status.toUpperCase()}
                  />
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">{i.detail}</div>
              </div>
              {i.cta && (
                <a
                  href={i.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
                >
                  {i.cta.label} →
                </a>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Environment variables">
        <div className="p-5 text-[12px] font-mono text-slate-400 space-y-1">
          <p><span className="text-emerald-400">✓</span> NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY</p>
          <p>{process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">·</span>} NEXT_PUBLIC_ADSENSE_CLIENT_ID</p>
          <p>{process.env.GOOGLE_BOOKS_API_KEY ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">·</span>} GOOGLE_BOOKS_API_KEY</p>
          <p>{process.env.VERCEL_API_TOKEN ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">·</span>} VERCEL_API_TOKEN <span className="text-slate-600">(optional — enables deployment feed)</span></p>
          <p>{process.env.GITHUB_TOKEN ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">·</span>} GITHUB_TOKEN <span className="text-slate-600">(optional — raises API rate limit)</span></p>
          <p>{process.env.ADMIN_EMAILS ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">·</span>} ADMIN_EMAILS <span className="text-slate-600">(comma-separated; defaults to owner)</span></p>
          <p>{process.env.RESEND_API_KEY ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">·</span>} RESEND_API_KEY <span className="text-slate-600">(optional — for email notifications)</span></p>
        </div>
      </Panel>
    </div>
  );
}
