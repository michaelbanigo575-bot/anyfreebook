'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getAllCategories } from '@/lib/data';

const GROUP_LABELS: Record<string, string> = {
  subject: '📚 Subjects',
  place: '🌍 Countries & Continents',
  language: '🗣️ Languages',
};

/** Navbar "Categories" dropdown: all categories, searchable, grouped. */
export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => getAllCategories(), []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? categories.filter(c => c.name.toLowerCase().includes(needle)) : categories;
    const groups: { key: string; items: typeof categories }[] = [];
    for (const key of ['subject', 'place', 'language']) {
      const items = list.filter(c => (c.group || 'subject') === key);
      if (items.length) groups.push({ key, items });
    }
    return groups;
  }, [q, categories]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1"
      >
        Categories
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[340px] max-w-[90vw] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden z-50">
          <div className="p-2.5 border-b border-[var(--border-subtle)]">
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Search ${categories.length} categories…`}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] py-8">No category matches &ldquo;{q}&rdquo;</p>
            )}
            {filtered.map(group => (
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
          <div className="p-2 border-t border-[var(--border-subtle)] text-center">
            <Link href="/explore" onClick={() => setOpen(false)} className="text-xs font-semibold text-[var(--primary)] hover:underline">
              Browse all categories →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
