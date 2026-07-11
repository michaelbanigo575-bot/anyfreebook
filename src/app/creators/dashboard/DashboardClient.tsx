'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deletePublication, updatePublication } from '@/lib/creators/client';
import type { Publication, ProgramConfig, CreatorTier } from '@/lib/creators/types';
import type { EarningsEstimate } from '@/lib/creators/earnings';

interface Props {
  handle: string | null;
  displayName: string | null;
  pubs: Publication[];
  stats: { totalViews: number; totalReads: number; totalReadSeconds: number; totalLikes: number; followerCount: number };
  earnings: EarningsEstimate;
  tier: CreatorTier;
  config: ProgramConfig;
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function DashboardClient({ handle, displayName, pubs, stats, earnings, tier, config }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const published = pubs.filter(p => p.status === 'published');
  const drafts = pubs.filter(p => p.status === 'draft');
  const hoursRead = (stats.totalReadSeconds / 3600).toFixed(1);
  const progressPct = Math.min(100, (earnings.verifiedReadsThisMonth / config.monthly_read_threshold) * 100);

  const toggleStatus = async (p: Publication) => {
    setBusy(p.id);
    await updatePublication(p.id, { publish: p.status !== 'published' });
    setBusy(null);
    startRefresh(() => router.refresh());
  };
  const remove = async (p: Publication) => {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    setBusy(p.id);
    await deletePublication(p.id);
    setBusy(null);
    startRefresh(() => router.refresh());
  };

  return (
    <div className="min-h-screen bg-[#0c0a1d] text-white">
      {/* Ambient glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.25em] text-violet-300/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Creator Studio {refreshing && <span className="text-white/40 normal-case tracking-normal">· syncing…</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">
              {displayName || 'Author'}
            </h1>
            {handle && (
              <Link href={`/author/${handle}`} className="text-sm text-violet-300 hover:text-violet-200 transition-colors">
                anyfreebook.com/author/{handle} ↗
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${tier.color} shadow-lg shadow-black/40`}>
              {tier.label} Author
            </span>
            <Link
              href="/classrooms/new"
              className="px-4 py-2.5 rounded-xl border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-all"
            >
              🎓 Host a class
            </Link>
            <Link
              href="/creators/new"
              className="group px-5 py-2.5 rounded-xl bg-white text-[#0c0a1d] text-sm font-bold hover:shadow-[0_0_30px_rgba(167,139,250,0.45)] hover:-translate-y-0.5 transition-all"
            >
              + New work
            </Link>
          </div>
        </header>

        {/* Earnings hero */}
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 via-[#161233] to-fuchsia-950/40 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-semibold">Estimated earnings · this month</div>
              <div className="mt-2 text-5xl md:text-6xl font-bold font-mono bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
                ${earnings.estimatedThisMonth.toFixed(2)}
              </div>
              <div className="text-xs text-white/50 mt-2">
                Lifetime est. ${earnings.estimatedLifetime.toFixed(2)} · {config.pool_percentage}% creator pool · payouts from ${config.min_payout_usd}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70 font-semibold">Verified reads · month</div>
              <div className="text-3xl font-bold font-mono mt-1">{fmt(earnings.verifiedReadsThisMonth)}</div>
            </div>
          </div>

          {/* Qualification meters — both reads AND followers must clear the bar */}
          <div className="relative mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-[11px] text-white/60 mb-1.5">
                <span className={earnings.readsToThreshold === 0 ? 'text-emerald-300 font-semibold' : ''}>
                  {earnings.readsToThreshold === 0 ? '✓ Verified reads target met' : `${fmt(earnings.readsToThreshold)} more verified reads needed`}
                </span>
                <span className="font-mono">{fmt(stats.totalReads)} / {fmt(config.monthly_read_threshold)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${earnings.readsToThreshold === 0 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-violet-400 to-fuchsia-400'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-white/60 mb-1.5">
                <span className={earnings.followersToThreshold === 0 ? 'text-emerald-300 font-semibold' : ''}>
                  {earnings.followersToThreshold === 0 ? '✓ Follower target met' : `${fmt(earnings.followersToThreshold)} more followers needed`}
                </span>
                <span className="font-mono">{fmt(stats.followerCount)} / {fmt(config.monthly_follower_threshold)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${earnings.followersToThreshold === 0 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-fuchsia-400 to-pink-400'}`}
                  style={{ width: `${Math.min(100, (stats.followerCount / config.monthly_follower_threshold) * 100)}%` }}
                />
              </div>
            </div>
            {earnings.qualified && (
              <p className="text-xs text-emerald-300 font-semibold">✓ Fully qualified for payout this month — min. ${config.min_payout_usd} to cash out</p>
            )}
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Followers" value={fmt(stats.followerCount)} accent="text-fuchsia-300" />
          <Stat label="Likes" value={fmt(stats.totalLikes)} accent="text-rose-300" />
          <Stat label="Views" value={fmt(stats.totalViews)} accent="text-sky-300" />
          <Stat label="Verified reads" value={fmt(stats.totalReads)} accent="text-emerald-300" />
          <Stat label="Hours read" value={hoursRead} accent="text-amber-300" />
          <Stat label="Published" value={String(published.length)} accent="text-violet-300" />
        </section>

        {/* Publications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Your works</h2>
            {drafts.length > 0 && <span className="text-xs text-white/40">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>}
          </div>

          {pubs.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-white/10 bg-white/[0.03]">
              <p className="text-5xl mb-3">✨</p>
              <p className="font-semibold text-white/90">Your studio is ready</p>
              <p className="text-sm text-white/50 mt-1 mb-5">Publish your first work and start building readers, followers and earnings.</p>
              <Link href="/creators/new" className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold hover:shadow-[0_0_30px_rgba(167,139,250,0.4)] transition-all">
                Write your first publication
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...published, ...drafts].map(p => (
                <div
                  key={p.id}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-violet-400/30 transition-all p-4 flex items-center gap-4"
                >
                  <div className={`w-1 self-stretch rounded-full ${p.status === 'published' ? 'bg-gradient-to-b from-emerald-400 to-teal-500' : 'bg-white/20'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={p.status === 'published' ? `/read/${p.slug}` : `/creators/publications/${p.id}/edit`}
                        className="font-semibold hover:text-violet-300 transition-colors truncate"
                      >
                        {p.title}
                      </Link>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.status === 'published' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/45 mt-1 font-mono">
                      <span>{p.category}</span>
                      <span>👁 {fmt(p.view_count)}</span>
                      <span>📖 {fmt(p.read_count)}</span>
                      <span>❤️ {fmt(p.like_count)}</span>
                      {typeof p.comment_count === 'number' && <span>💬 {fmt(p.comment_count)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Link href={`/creators/publications/${p.id}/edit`} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 hover:bg-white/10 transition-colors">
                      Edit
                    </Link>
                    <Link href={`/creators/publications/${p.id}/chapters`} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 hover:bg-white/10 transition-colors">
                      Chapters
                    </Link>
                    <button onClick={() => toggleStatus(p)} disabled={busy === p.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 hover:bg-white/10 transition-colors disabled:opacity-40">
                      {busy === p.id ? '…' : p.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => remove(p)} disabled={busy === p.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-40">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tier + growth strip */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tier.color} shadow-lg`} />
              <div>
                <div className="font-bold">{tier.label} tier</div>
                <div className="text-xs text-white/50">{tier.perk}</div>
              </div>
            </div>
            <Link href="/creators" className="inline-block mt-3 text-xs font-semibold text-violet-300 hover:text-violet-200">
              See all tiers & program terms →
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="font-bold">Grow faster</div>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">
              Share your author page after every new work — followers get your publications in their feed, and every verified read moves you up the payout meter.
            </p>
            {handle && (
              <button
                onClick={() => { navigator.clipboard.writeText(`https://anyfreebook.com/author/${handle}`); }}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/15 hover:bg-white/10 transition-colors"
              >
                Copy author link
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 hover:-translate-y-0.5 transition-all p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
