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

  const popular = categories.slice(0, 8);

  return (
    <div ref={ref} className="relative max-w-2xl mx-auto">
      {/* The search button/box */}
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[var(--surface)] border-2 text-left transition-all ${
          open ? 'border-[var(--primary)] shadow-lg' : 'border-[var(--border-subtle)] hover:border-[var(--border)] shadow-sm'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--text-muted)] flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        {open ? (
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={`Type to search ${categories.length} categories…`}
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
        ) : (
          <span className="flex-1 text-sm text-[var(--text-muted)]">
            Search all {categories.length} categories — subjects, countries & languages
          </span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-[var(--text-muted)] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {/* Popular quick chips (collapsed state only) */}
      {!open && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {popular.map(c => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--primary)] hover:text-white hover:border-transparent transition-all">
              {c.icon} {c.name}
            </Link>
          ))}
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
