'use client';

import { useMemo, useState } from 'react';
import { CategoryGrid } from './CategoryGrid';
import type { Category } from '@/lib/data';

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'subject', label: '📚 Subjects' },
  { key: 'place', label: '🌍 Countries' },
  { key: 'language', label: '🗣️ Languages' },
];

/** Explore page: all categories with live search + group tabs. */
export function ExploreCategories({ categories }: { categories: Category[] }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return categories.filter(c =>
      (tab === 'all' || (c.group || 'subject') === tab) &&
      (!needle || c.name.toLowerCase().includes(needle))
    );
  }, [categories, q, tab]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={`Search ${categories.length} categories — e.g. "poetry", "Nigerian", "French"…`}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"
        />
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] py-16">No category matches &ldquo;{q}&rdquo; — try another word.</p>
      ) : (
        <CategoryGrid categories={filtered} />
      )}
    </div>
  );
}
