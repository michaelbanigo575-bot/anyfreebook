import type { Metadata } from 'next';
import Link from 'next/link';
import { getRecentPublications } from '@/lib/creators/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Discover works published by ANYFREEBOOK authors',
  description: 'Read original books, stories, guides and poetry published directly by independent authors on ANYFREEBOOK.',
};

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default async function DiscoverPage() {
  const pubs = await getRecentPublications(48);

  return (
    <div className="content-wrapper py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">Published on ANYFREEBOOK</h1>
          <p className="text-[var(--text-secondary)] mt-1">Original works posted directly by independent authors.</p>
        </div>
        <Link href="/creators" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Become an author</Link>
      </div>

      {pubs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
          <p className="text-5xl mb-3">✍️</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No published works yet — be the first</p>
          <p className="text-sm text-[var(--text-muted)] mt-1 mb-5">Publish your book, story, or guide and start earning from readers.</p>
          <Link href="/creators" className="inline-flex px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold">Start publishing free</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pubs.map(p => (
            <Link key={p.id} href={`/read/${p.slug}`} className="group rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg transition-all overflow-hidden">
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-[var(--gradient-start)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center">
                  <span className="text-4xl">📖</span>
                </div>
              )}
              <div className="p-3">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary)] uppercase">{p.content_type}</span>
                <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)] mt-1.5 line-clamp-2">{p.title}</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">by {p.authorName}</p>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">{fmt(p.view_count)} reads · {fmt(p.read_count)} verified</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
