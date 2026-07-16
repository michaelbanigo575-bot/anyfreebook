'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Category } from '@/lib/data';

const GROUP_LABELS: Record<string, string> = {
  subject: '📚 Subjects',
  place: '🌍 Countries & Continents',
  language: '🗣️ Languages',
};

/**
 * Homepage category browser: one clean search box — click or type and every
 * category appears in a dropdown panel, filtered live. Replaces the giant
 * pill/grid sprawl.
 */
export function HomeCategoryFinder({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? categories.filter(c => c.name.toLowerCase().includes(needle)) : categories;
    return (['subject', 'place', 'language'] as const)
      .map(key => ({ key, items: list.filter(c => (c.group || 'subject') === key) }))
      .filter(g => g.items.length > 0);
  }, [categories, q]);

  return (
    <div ref={ref} className="relative max-w-2xl mx-auto">
      {!open ? (
        /* Collapsed: one distinctive "See categories" button — animated gradient ring */
        <div className="flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="group relative inline-flex rounded-full p-[2px] bg-gradient-to-r from-[var(--gradient-start)] via-fuchsia-500 to-[var(--gradient-end)] bg-[length:200%_200%] animate-gradient-x shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-[var(--bg)] text-sm font-bold text-[var(--text)] group-hover:bg-transparent group-hover:text-white transition-colors">
              <span className="grid grid-cols-2 gap-[3px]" aria-hidden>
                {[0, 1, 2, 3].map(i => <span key={i} className="w-[5px] h-[5px] rounded-[1.5px] bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] group-hover:from-white group-hover:to-white transition-colors" />)}
              </span>
              See all {categories.length} categories
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </button>
        </div>
      ) : (
        /* Open: search box */
        <div className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[var(--surface)] border-2 border-[var(--primary)] shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--text-muted)] flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Type to search ${categories.length} categories…`}
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button onClick={() => { setOpen(false); setQ(''); }} className="text-[var(--text-muted)] hover:text-[var(--text)]" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* The dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden z-40">
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {groups.length === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] py-10">Nothing matches &ldquo;{q}&rdquo; — try another word.</p>
            )}
            {groups.map(group => (
              <div key={group.key}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {GROUP_LABELS[group.key]} ({group.items.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {group.items.map(c => (
                    <Link
                      key={c.slug}
                      href={`/category/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <span className="text-base w-6 text-center flex-shrink-0">{c.icon}</span>
                      <span className="text-sm text-[var(--text)] truncate flex-1">{c.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{(c.bookCount / 1000).toFixed(0)}k</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
