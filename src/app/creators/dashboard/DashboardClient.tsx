'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deletePublication, updatePublication } from '@/lib/creators/client';
import type { Publication, ProgramConfig, CreatorTier } from '@/lib/creators/types';
import type { EarningsEstimate } from '@/lib/creators/earnings';

interface Props {
  handle: string | null;
  displayName: string | null;
  pubs: Publication[];
  stats: { totalViews: number; totalReads: number; totalReadSeconds: number };
  earnings: EarningsEstimate;
  tier: CreatorTier;
  config: ProgramConfig;
}

export function DashboardClient({ handle, displayName, pubs, stats, earnings, tier, config }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const published = pubs.filter(p => p.status === 'published');
  const drafts = pubs.filter(p => p.status === 'draft');
  const hoursRead = (stats.totalReadSeconds / 3600).toFixed(1);
  const progressPct = Math.min(100, (earnings.verifiedReadsThisMonth / config.monthly_read_threshold) * 100);

  const toggleStatus = async (p: Publication) => {
    setBusy(p.id);
    await updatePublication(p.id, { publish: p.status !== 'published' });
    setBusy(null);
    router.refresh();
  };
  const remove = async (p: Publication) => {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    setBusy(p.id);
    await deletePublication(p.id);
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="content-wrapper py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">Creator Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {displayName || 'Author'} · {handle ? <Link href={`/author/${handle}`} className="text-[var(--primary)] hover:underline">anyfreebook.com/author/{handle}</Link> : 'no handle'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${tier.color}`}>{tier.label} Author</span>
          <Link href="/creators/new" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all">
            + New publication
          </Link>
        </div>
      </div>

      {/* Earnings hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Estimated earnings this month</div>
            <div className="text-4xl font-bold font-mono mt-1">${earnings.estimatedThisMonth.toFixed(2)}</div>
            <div className="text-xs opacity-80 mt-1">Lifetime estimate: ${earnings.estimatedLifetime.toFixed(2)} · {config.pool_percentage}% revenue-share pool</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest opacity-80">Verified reads this month</div>
            <div className="text-2xl font-bold font-mono mt-1">{earnings.verifiedReadsThisMonth.toLocaleString()}</div>
          </div>
        </div>
        {/* Qualification progress */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] opacity-90 mb-1">
            <span>{earnings.qualified ? '✓ Qualified for payout' : `${earnings.readsToThreshold.toLocaleString()} more verified reads to qualify`}</span>
            <span>{config.monthly_read_threshold.toLocaleString()} / month</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <p className="text-[11px] opacity-75 mt-3">
          Payouts activate as ad revenue scales. Earnings shown are estimates based on current verified reads and the pool rate. You cash out once you pass ${config.min_payout_usd}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total views" value={stats.totalViews.toLocaleString()} />
        <StatTile label="Verified reads" value={stats.totalReads.toLocaleString()} />
        <StatTile label="Hours read" value={hoursRead} />
        <StatTile label="Published works" value={String(published.length)} />
      </div>

      {/* Publications */}
      <section>
        <h2 className="text-lg font-bold text-[var(--text)] mb-3">Your publications</h2>
        {pubs.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-[var(--text-secondary)] font-medium">You haven&apos;t published anything yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">Post your first work and start building your readership.</p>
            <Link href="/creators/new" className="inline-flex px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold">Write your first publication</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {[...published, ...drafts].map(p => (
              <div key={p.id} className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={p.status === 'published' ? `/read/${p.slug}` : `/creators/publications/${p.id}/edit`} className="font-semibold text-[var(--text)] hover:text-[var(--primary)] truncate">{p.title}</Link>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{p.status.toUpperCase()}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {p.category} · {p.view_count.toLocaleString()} views · {p.read_count.toLocaleString()} verified reads
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link href={`/creators/publications/${p.id}/edit`} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">Edit</Link>
                  <button onClick={() => toggleStatus(p)} disabled={busy === p.id} className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50">
                    {p.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => remove(p)} disabled={busy === p.id} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tier perks */}
      <section className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6">
        <h2 className="text-sm font-bold text-[var(--text)] mb-1">Your tier: {tier.label}</h2>
        <p className="text-xs text-[var(--text-muted)] mb-3">{tier.perk}. Climb tiers by growing verified reads to unlock featuring, homepage spots, and revenue-share bonuses.</p>
        <Link href="/creators" className="text-sm text-[var(--primary)] hover:underline">See all tiers & program details →</Link>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
      <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{label}</div>
      <div className="text-2xl font-bold font-mono text-[var(--text)] mt-1">{value}</div>
    </div>
  );
}
