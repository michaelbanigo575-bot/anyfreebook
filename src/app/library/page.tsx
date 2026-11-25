'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { readingHistory, type ReadingItem } from '@/lib/continueReading';
import { placeholderGradient } from '@/lib/covers';

interface Shelf { href: string; title: string; note: string }
type Tab = 'reading' | 'saved';

function Grid({ items }: { items: Shelf[] }) {
  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map(i => (
        <li key={i.href}>
          <Link href={i.href} className="block">
            <span className={`flex items-end aspect-[2/3] p-2 rounded-r-lg rounded-l-sm border-l-[3px] border-[#6EC1EA] bg-gradient-to-br ${placeholderGradient(i.title)} shadow-book`}>
              <span className="font-serif-title text-white text-xs font-bold leading-snug line-clamp-4">{i.title}</span>
            </span>
            <span className="block mt-1.5 text-[11px] text-[var(--text-muted)] line-clamp-1">{i.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('reading');
  const [history, setHistory] = useState<ReadingItem[]>([]);
  const [saved, setSaved] = useState<Shelf[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setHistory(readingHistory()); }, []);

  useEffect(() => {
    if (!user) { setSaved(null); return; }
    let live = true;
    const sb = createClient();
    Promise.all([
      sb.from('publication_saves').select('publication:publications(title, slug)').eq('user_id', user.id).limit(100),
      sb.from('book_interactions').select('book_title, book_slug, book_author, action').eq('user_id', user.id).in('action', ['wishlisted', 'favorited']).order('created_at', { ascending: false }).limit(100),
    ]).then(([pubs, books]) => {
      if (!live) return;
      setFailed(!!(pubs.error || books.error));
      const list: Shelf[] = [];
      for (const row of (pubs.data || []) as unknown as { publication: { title: string; slug: string } | null }[]) {
        if (row.publication) list.push({ href: `/read/${row.publication.slug}`, title: row.publication.title, note: 'Saved guide' });
      }
      for (const b of books.data || []) {
        if (b.book_slug && b.book_title) list.push({ href: `/book/${b.book_slug}`, title: b.book_title, note: b.book_author || 'Book' });
      }
      setSaved(Array.from(new Map(list.map(i => [i.href, i])).values()));
    });
    return () => { live = false; };
  }, [user]);

  const empty = (text: string) => (
    <div className="text-center py-8">
      <p className="text-[var(--text-secondary)]">{text}</p>
      <Link href="/explore" className="inline-flex items-center min-h-[44px] mt-4 px-6 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Find a book</Link>
    </div>
  );

  return (
    <div className="content-wrapper py-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-4">My library</h1>
      <div role="tablist" className="flex gap-6 border-b border-[var(--border-subtle)] mb-5">
        {([['reading', 'Recently read'], ['saved', 'Saved']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`min-h-[44px] text-sm font-semibold border-b-[3px] ${tab === id ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reading' && (history.length
        ? <Grid items={history.map(h => ({ href: h.href, title: h.title, note: `${h.percent}% of the page` }))} />
        : empty('What you read on this device shows up here.'))}

      {tab === 'saved' && !loading && !user && (
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)]">Sign in to see the books you saved.</p>
          <Link href="/login?redirect=/library" className="inline-flex items-center min-h-[44px] mt-4 px-6 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign in</Link>
        </div>
      )}
      {tab === 'saved' && user && saved === null && <p className="py-8 text-center text-[var(--text-muted)]">Loading your shelf…</p>}
      {tab === 'saved' && user && saved !== null && (
        <>
          {failed && <p role="alert" className="mb-3 text-sm text-red-600">Some saved items couldn&apos;t load. Refresh to try again.</p>}
          {saved.length ? <Grid items={saved} /> : empty('Nothing saved yet.')}
        </>
      )}
    </div>
  );
}
