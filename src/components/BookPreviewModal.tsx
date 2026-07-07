'use client';

import { useEffect, useCallback } from 'react';
import type { Book } from '@/lib/data';

/**
 * Resolve an embeddable preview URL for a book based on its source.
 * Returns null when the source has no embeddable reader (we then show a fallback).
 */
export function getPreviewEmbedUrl(book: Book): string | null {
  const { sourceUrl, downloadLinks } = book;
  const allUrls = [sourceUrl, ...(downloadLinks?.map(l => l.url) || [])].filter((u): u is string => !!u);

  // Internet Archive — works regardless of where the link came from (live API or resolved lookup)
  const archiveUrl = allUrls.find(u => u.includes('archive.org/details/'));
  if (archiveUrl) {
    const identifier = archiveUrl.split('archive.org/details/')[1]?.split(/[/?#]/)[0];
    if (identifier) return `https://archive.org/embed/${identifier}`;
  }

  // Google Books
  const gbUrl = allUrls.find(u => u.includes('books.google.com/books'));
  if (gbUrl) {
    const match = gbUrl.match(/[?&]id=([^&]+)/);
    if (match) return `https://books.google.com/books?id=${match[1]}&printsec=frontcover&output=embed`;
  }

  // Project Gutenberg — prefer the HTML reading version if we can derive an ebook id
  const gutenbergUrl = allUrls.find(u => u.includes('gutenberg.org'));
  if (gutenbergUrl) {
    const match = gutenbergUrl.match(/gutenberg\.org\/(?:ebooks|cache\/epub)\/(\d+)/);
    if (match) return `https://www.gutenberg.org/cache/epub/${match[1]}/pg${match[1]}-images.html`;
  }

  return null;
}

interface BookPreviewModalProps {
  book: Book;
  onClose: () => void;
}

export function BookPreviewModal({ book, onClose }: BookPreviewModalProps) {
  const embedUrl = getPreviewEmbedUrl(book);
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

        {/* Preview body */}
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Preview of ${book.title}`}
            className="flex-1 w-full border-0 bg-white"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-5xl">📖</p>
            <p className="text-lg font-semibold text-[var(--text)]">
              In-page preview isn&apos;t available for this source
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              {book.sourceType === 'pubmed' || book.sourceType === 'doaj'
                ? 'Research articles open directly on the publisher\'s site with the full text free to read.'
                : 'You can read this book for free at its original source.'}
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
