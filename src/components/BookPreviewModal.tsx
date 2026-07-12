'use client';

import { useEffect, useCallback } from 'react';
import type { Book } from '@/lib/data';
import { DocumentReader } from './DocumentReader';

type ReaderTarget = { mode: 'pdf' | 'text' | 'embed'; url: string };

/**
 * Resolve the best in-house-reader target for an external book:
 * a direct PDF or Gutenberg plain-text renders in the ANYFREEBOOK Reader;
 * Archive/Gutenberg reading pages embed inside it. Returns null when the
 * source has nothing readable (e.g. Google Books, catalog-only records).
 */
export function getReaderTarget(book: Book): ReaderTarget | null {
  const links = book.downloadLinks || [];
  const allUrls = [book.sourceUrl, ...links.map(l => l.url)].filter((u): u is string => !!u);

  // 1. A direct PDF from any source → our PDF reader (via proxy)
  const pdf = links.find(l => /\.pdf(\?|$)/i.test(l.url));
  if (pdf) return { mode: 'pdf', url: pdf.url };

  // 2. Gutenberg plain text → our reflowable text reader (covers ~all of Gutenberg)
  const txt = links.find(l => /\.txt(\?|$)/i.test(l.url) || /\bTXT\b/i.test(l.label));
  if (txt) return { mode: 'text', url: txt.url };

  // 3. Internet Archive scanned book → embed the BookReader inside our frame
  const archiveUrl = allUrls.find(u => u.includes('archive.org/details/'));
  if (archiveUrl) {
    const id = archiveUrl.split('archive.org/details/')[1]?.split(/[/?#]/)[0];
    if (id) return { mode: 'embed', url: `https://archive.org/embed/${id}` };
  }

  // 4. Gutenberg reading page → embed the images-HTML version
  const gutenbergUrl = allUrls.find(u => u.includes('gutenberg.org'));
  if (gutenbergUrl) {
    const m = gutenbergUrl.match(/gutenberg\.org\/(?:ebooks|cache\/epub)\/(\d+)/);
    if (m) return { mode: 'embed', url: `https://www.gutenberg.org/cache/epub/${m[1]}/pg${m[1]}-images.html` };
  }

  return null;
}

interface BookPreviewModalProps {
  book: Book;
  onClose: () => void;
}

export function BookPreviewModal({ book, onClose }: BookPreviewModalProps) {
  const readerTarget = getReaderTarget(book);
  const externalUrl = book.sourceUrl || book.downloadLinks?.[0]?.url;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl h-[90vh] bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--text)] truncate">{book.title}</h2>
            <p className="text-xs text-[var(--text-muted)] truncate">{book.author}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-semibold hover:shadow-md transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                Open at Source
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors"
              aria-label="Close preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Preview body — the ANYFREEBOOK Reader when the source has readable content */}
        {readerTarget ? (
          <div className="flex-1 overflow-hidden p-2 bg-[var(--bg-secondary)]">
            <DocumentReader url={readerTarget.url} mode={readerTarget.mode} title={book.title} height="100%" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-5xl">📖</p>
            <p className="text-lg font-semibold text-[var(--text)]">
              {book.sourceType === 'googlebooks'
                ? "Google Books doesn't allow in-page previews"
                : book.sourceType === 'pubmed' || book.sourceType === 'doaj'
                ? 'This is a research article, not a book'
                : "No full-text copy found for this title"}
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              {book.sourceType === 'googlebooks'
                ? 'Google blocks embedding of its preview pages on other sites — this is a restriction on their end, not ours. You can still read it on Google Books directly.'
                : book.sourceType === 'pubmed' || book.sourceType === 'doaj'
                ? 'Research articles open directly on the publisher\'s site with the full text free to read.'
                : 'This source only has catalog information, not a scanned or digital copy available to preview. You can still view its details at the source.'}
            </p>
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all"
              >
                Read Free at Source
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
