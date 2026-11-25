'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readingHistory, type ReadingItem } from '@/lib/continueReading';

/** The last thing you were reading, one tap from where you left it. Hidden until there is one. */
export function ContinueReading() {
  const [item, setItem] = useState<ReadingItem | null>(null);
  useEffect(() => { setItem(readingHistory().find(i => i.percent < 100) || null); }, []);
  if (!item) return null;

  return (
    <section className="content-wrapper pt-2 pb-4" aria-label="Continue reading">
      <Link href={item.href} className="premium-card flex items-center gap-4 max-w-2xl mx-auto p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] active:scale-[0.99] transition-transform">
        <span aria-hidden className="w-12 h-[70px] flex-shrink-0 rounded-r-md rounded-l-sm bg-gradient-to-br from-[#00628C] to-[#050F26] border-l-[3px] border-[#6EC1EA] shadow-book" />
        <span className="flex-1 min-w-0">
          <span className="block text-xs text-[var(--text-muted)]">Continue reading</span>
          <span className="block font-serif-title font-bold text-[var(--text)] line-clamp-1">{item.title}</span>
          <span className="block h-1.5 rounded-full bg-[var(--primary-light)] my-2">
            <span className="block h-1.5 rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(3, item.percent)}%` }} />
          </span>
          <span className="block text-xs text-[var(--text-muted)]">{item.percent}% of the page</span>
        </span>
        <span aria-hidden className="w-11 h-11 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </Link>
    </section>
  );
}
