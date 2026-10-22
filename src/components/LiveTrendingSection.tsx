'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book } from '@/lib/data';
import { cardClass } from '@/lib/ui';
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
const STEP = 5;     // books per tick — one row on the widest breakpoint

/**
 * Stable per-book key. Upstream ids are source-prefixed (ol-, pg-, gb-, ia-)
 * and the local catalog uses its own numeric ids, so the id survives the
 * rotation: a card is never re-created just because its rank changed.
 */
function bookKey(book: Book): string {
  return book.id || book.slug || `${book.sourceType || 'unknown'}:${book.title}`;
}

export function LiveTrendingSection({ books }: { books: Book[] }) {
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [offset, setOffset] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hovering = useRef(false);
  const touching = useRef(false);

  // The pool merges five upstream sources, so the same work can arrive twice
  // (e.g. two Open Library shelves). Duplicate keys make React recycle the
  // wrong node, so keep the first occurrence of each book only.
  const pool = useMemo(() => {
    const seen = new Set<string>();
    return books.filter(book => {
      const key = bookKey(book);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [books]);
  const count = pool.length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // A touch can end outside the grid (the user scrolls the page away), so the
  // end of the gesture is tracked on the document — otherwise the grid would
  // stay paused for good.
  useEffect(() => {
    const end = () => { touching.current = false; };
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    return () => {
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
    };
  }, []);

  // Dynamic display: rotate the window through the whole pool every 3 seconds.
  // Hover, touch, an open preview and the pause button all freeze it, and
  // reduced-motion users never get it at all.
  useEffect(() => {
    if (count <= VISIBLE || reducedMotion) return;
    const t = setInterval(() => {
      if (hovering.current || touching.current || userPaused || previewBook) return;
      setOffset(o => (o + STEP) % count); // advance one row
    }, 3000);
    return () => clearInterval(t);
  }, [count, reducedMotion, userPaused, previewBook]);

  if (!count) return null;

  const paused = userPaused || reducedMotion;

  return (
    <>
    {/* The grid moves on its own, so give people a way to stop it */}
    {count > VISIBLE && (
    <div className="flex justify-end mb-2">
      <button
        type="button"
        onClick={() => setUserPaused(p => !p)}
        disabled={reducedMotion}
        aria-pressed={paused}
        aria-label={paused ? 'Play trending rotation' : 'Pause trending rotation'}
        title={reducedMotion ? 'Reduced motion is enabled in your system settings' : undefined}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--primary)] transition-colors disabled:opacity-50 disabled:hover:text-[var(--text-muted)]"
      >
        {paused ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        )}
        {paused ? 'Play' : 'Pause'}
      </button>
    </div>
    )}

    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
      onTouchStart={() => { touching.current = true; }}
    >
      {/* Every book stays mounted and the window is a CSS `order` slice of the
          pool, so rotating the grid never re-creates a card — no remount, no
          replayed fade-in, no flicker. Books outside the window are hidden
          (and their covers are not mounted, so we still fetch 25 images). */}
      {pool.map((book, i) => {
        const pos = (i - offset + count) % count;
        const inWindow = pos < VISIBLE;
        return (
        <div
          key={bookKey(book)}
          style={{ order: pos }}
          className={`${inWindow ? '' : 'hidden '}group overflow-hidden animate-fade-in ${cardClass({ padding: 'p-0' })}`}
        >
          <div className="aspect-[2/3] relative bg-[var(--bg-secondary)]">
            {/* Real cover inside the 3D interactive book */}
            <div className="w-full h-full flex items-center justify-center py-2">
              {inWindow && <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} size="md" />}
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
                onClick={() => setPreviewBook(book)}
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
        );
      })}
    </div>

    {previewBook && (
      <BookPreviewModal book={previewBook} onClose={() => setPreviewBook(null)} />
    )}
    </>
  );
}
