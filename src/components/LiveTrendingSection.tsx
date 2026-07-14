'use client';

import { useEffect, useRef, useState } from 'react';
import type { Book } from '@/lib/data';
import { BookCover } from './BookCover';
import { BookPreviewModal } from './BookPreviewModal';

function SourceBadge({ source }: { source?: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    openlibrary: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Open Library' },
    gutenberg: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Gutenberg' },
    googlebooks: { bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Google Books' },
    archive: { bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', label: 'Internet Archive' },
    pubmed: { bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', label: 'PubMed Central' },
    doaj: { bg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', label: 'DOAJ' },
    local: { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Curated' },
  };
  const s = source || 'local';
  const c = config[s] || config.local;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg}`}>
      {c.label}
    </span>
  );
}

const VISIBLE = 25; // books shown at once on the homepage grid

export function LiveTrendingSection({ books }: { books: Book[] }) {
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [offset, setOffset] = useState(0);
  const paused = useRef(false);

  // Dynamic display: rotate the window through the whole pool every 3 seconds.
  // Pauses while the cursor is over the grid or a preview is open, and respects reduced motion.
  useEffect(() => {
    if (books.length <= VISIBLE) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      if (!paused.current) setOffset(o => (o + 5) % books.length); // advance one row
    }, 3000);
    return () => clearInterval(t);
  }, [books.length]);

  if (!books.length) return null;

  // Circular window over the pool (no wrap-duplicates when the pool is small)
  const visible = books.length <= VISIBLE
    ? books
    : Array.from({ length: VISIBLE }, (_, i) => books[(offset + i) % books.length]);

  return (
    <>
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = !!previewBook; }}
    >
      {visible.map((book) => (
        <div
          key={book.id}
          className="group rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--border)] hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in"
        >
          <div className="aspect-[2/3] relative bg-[var(--bg-secondary)]">
            {/* Real cover inside the 3D interactive book */}
            <div className="w-full h-full flex items-center justify-center py-2">
              <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} size="md" />
            </div>
            <div className="absolute top-2 left-2 flex gap-1">
              <SourceBadge source={book.sourceType} />
            </div>
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-1">{book.title}</h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{book.author}</p>
            <div className="flex gap-1 mt-1.5">
              {book.formats.slice(0, 2).map(f => (
                <span key={f} className="text-[9px] px-1 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">{f}</span>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => { setPreviewBook(book); paused.current = true; }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-[11px] font-semibold hover:bg-[var(--primary-light)] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview
              </button>
              {book.sourceUrl ? (
                <a
                  href={book.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-[11px] font-semibold hover:shadow-md transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                  Read Free
                </a>
              ) : (
                <a
                  href={`/book/${book.slug}`}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-[11px] font-semibold hover:shadow-md transition-all"
                >
                  View
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>

    {previewBook && (
      <BookPreviewModal book={previewBook} onClose={() => { setPreviewBook(null); paused.current = false; }} />
    )}
    </>
  );
}
