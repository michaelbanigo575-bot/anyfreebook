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
 * Hero "Category" button: sits beside the main search bar. Click → dropdown
 * panel with its own search input over every category.
 */
export function HomeCategoryFinder({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 60); }, [open]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? categories.filter(c => c.name.toLowerCase().includes(needle)) : categories;
    return (['subject', 'place', 'language'] as const)
      .map(key => ({ key, items: list.filter(c => (c.group || 'subject') === key) }))
      .filter(g => g.items.length > 0);
  }, [categories, q]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* The Category button — matches the search bar's height, gradient accent */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`h-full inline-flex items-center gap-2 px-4 sm:px-5 rounded-xl text-sm font-bold transition-all ${
          open
            ? 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg'
            : 'bg-[var(--surface)] text-[var(--text)] border-2 border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] shadow-sm'
        }`}
        aria-expanded={open}
      >
        <span className="grid grid-cols-2 gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={`w-[5px] h-[5px] rounded-[1.5px] ${open ? 'bg-white' : 'bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)]'}`} />
          ))}
        </span>
        Category
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {/* Dropdown: search + every category, grouped */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[92vw] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden z-50 text-left">
          <div className="p-2.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] focus-within:border-[var(--primary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--text-muted)] flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Search ${categories.length} categories…`}
                className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
          <div className="max-h-[46vh] overflow-y-auto p-1.5">
            {groups.length === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] py-8">Nothing matches &ldquo;{q}&rdquo;</p>
            )}
            {groups.map(group => (
              <div key={group.key}>
                <p className="px-2.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {GROUP_LABELS[group.key]} ({group.items.length})
                </p>
                {group.items.map(c => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    onClick={() => { setOpen(false); setQ(''); }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <span className="text-base w-6 text-center flex-shrink-0">{c.icon}</span>
                    <span className="text-sm text-[var(--text)] truncate flex-1">{c.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{(c.bookCount / 1000).toFixed(0)}k</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
