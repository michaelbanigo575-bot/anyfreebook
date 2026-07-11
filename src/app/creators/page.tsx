import type { Metadata } from 'next';
import Link from 'next/link';
import { getProgramConfig, getRecentPublications } from '@/lib/creators/server';
import { CREATOR_TIERS } from '@/lib/creators/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creator Program — Get paid to publish on ANYFREEBOOK',
  description: 'Publish your books, stories and guides on ANYFREEBOOK, reach millions of readers, and earn a share of ad revenue every time people read your work.',
};

export default async function CreatorProgramPage() {
  const [config, recent] = await Promise.all([getProgramConfig(), getRecentPublications(6)]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I get paid?', acceptedAnswer: { '@type': 'Answer', text: `You earn a share of the ${config.pool_percentage}% creator revenue pool based on how much verified reading your work generates. Payouts begin once you pass ${config.monthly_read_threshold} verified reads and ${config.monthly_follower_threshold} readers per month, and reach the $${config.min_payout_usd} minimum.` } },
      { '@type': 'Question', name: 'Does it cost anything to publish?', acceptedAnswer: { '@type': 'Answer', text: 'No. Publishing on ANYFREEBOOK is completely free. You keep the rights to your work.' } },
      { '@type': 'Question', name: 'What can I publish?', acceptedAnswer: { '@type': 'Answer', text: 'Original books, stories, guides, articles and poetry that you own the rights to.' } },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/3 w-[500px] h-[500px] bg-[var(--primary)]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        <div className="content-wrapper text-center py-16 md:py-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[var(--primary)] font-mono text-xs tracking-widest font-semibold">CREATOR PROGRAM — NOW OPEN</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-[var(--text)] leading-[1.05] max-w-3xl mx-auto text-balance">
            Get paid every time<br />someone reads <span className="gradient-text">your</span> book.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto">
            Publish your writing on ANYFREEBOOK, reach millions of readers who come here for free books, and earn a share of the revenue your work generates — just like creators do on YouTube and TikTok.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/creators/dashboard" className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Start publishing — free
            </Link>
            <Link href="/creators/discover" className="px-8 py-3.5 rounded-xl border-2 border-[var(--border)] text-[var(--text)] font-semibold hover:bg-[var(--surface-hover)] transition-all">
              See what authors publish
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--text-muted)]">No fees · Keep your rights · {config.pool_percentage}% revenue-share pool</p>
        </div>
      </section>

      {/* THE PITCH — 3 reasons */}
      <section className="content-wrapper py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '💰', title: 'Earn from every read', desc: `Every reader who spends real time on your work earns you a slice of the ${config.pool_percentage}% creator pool. The more people read, the more you make.` },
            { icon: '🌍', title: 'Built-in audience', desc: 'Readers already come to ANYFREEBOOK for free books — your work gets discovered by people actively looking to read, not scrolling past.' },
            { icon: '📈', title: 'Grow & level up', desc: 'Climb creator tiers as your readership grows to unlock featuring, homepage placement, and revenue-share bonuses.' },
          ].map(c => (
            <div key={c.title} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="text-lg font-bold text-[var(--text)]">{c.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="content-wrapper py-12">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] text-center mb-10">How you get paid</h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { n: '1', title: 'Publish', desc: 'Post your book, story or guide in minutes. It goes live to millions of readers.' },
            { n: '2', title: 'Get read', desc: 'Readers discover and read your work. We count genuine, verified reads — not empty clicks.' },
            { n: '3', title: 'Earn your share', desc: `${config.pool_percentage}% of the ad revenue your content generates goes into the creator pool, split by how much people read your work.` },
            { n: '4', title: 'Cash out', desc: `Once you pass ${config.monthly_read_threshold.toLocaleString()} verified reads, ${config.monthly_follower_threshold.toLocaleString()} readers and reach $${config.min_payout_usd}, request a payout.` },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">{s.n}</div>
              <h3 className="font-bold text-[var(--text)]">{s.title}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REVENUE SPLIT — transparency framed as generosity */}
      <section className="content-wrapper py-12">
        <div className="max-w-2xl mx-auto rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-8 text-center">
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">A fair, transparent split</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">We put a full <strong className="text-[var(--primary)]">{config.pool_percentage}%</strong> of the ad revenue your content generates back into the creator pool. We keep {config.platform_percentage}% to run the platform, keep the lights on, and bring you more readers.</p>
          <div className="flex rounded-full overflow-hidden h-10 text-xs font-bold">
            <div className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white flex items-center justify-center" style={{ width: `${config.pool_percentage}%` }}>
              {config.pool_percentage}% Creators
            </div>
            <div className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center justify-center" style={{ width: `${config.platform_percentage}%` }}>
              {config.platform_percentage}% Platform
            </div>
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="content-wrapper py-12">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] text-center mb-3">Creator tiers</h2>
        <p className="text-center text-[var(--text-muted)] mb-10">Grow your readership to climb tiers and unlock more.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CREATOR_TIERS.map(t => (
            <div key={t.id} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-5 text-center">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} mx-auto mb-3`} />
              <div className="font-bold text-[var(--text)]">{t.label}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">{t.minReads === 0 ? 'Start here' : `${t.minReads.toLocaleString()}+ reads`}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-2">{t.perk}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT WORKS */}
      {recent.length > 0 && (
        <section className="content-wrapper py-12">
          <h2 className="text-xl font-bold text-[var(--text)] mb-6">Recently published by authors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {recent.map(p => (
              <Link key={p.id} href={`/read/${p.slug}`} className="group rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all overflow-hidden">
                <div className="h-28 bg-gradient-to-br from-[var(--gradient-start)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center">
                  {p.cover_url ? <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" /> : <span className="text-2xl">📖</span>}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-[var(--text)] line-clamp-2 group-hover:text-[var(--primary)]">{p.title}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{p.authorName}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="content-wrapper py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] mb-3">Your readers are already here.</h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">Join the Creator Program free and start earning from your writing today.</p>
        <Link href="/creators/dashboard" className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
          Become an author — free
        </Link>
      </section>
    </div>
  );
}
