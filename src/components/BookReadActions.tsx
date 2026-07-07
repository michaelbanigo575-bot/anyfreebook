'use client';

import { useState } from 'react';
import { BookPreviewModal } from './BookPreviewModal';
import type { Book } from '@/lib/data';

interface BookReadActionsProps {
  book: Book;
  formats: string[];
}

export function BookReadActions({ book, formats }: BookReadActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const primaryLink = book.downloadLinks?.[0];
  const otherLinks = book.downloadLinks?.slice(1) || [];

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Read or download</h3>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>

        {primaryLink ? (
          <a
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]
              text-white shadow-md hover:shadow-lg hover:-translate-y-0.5
              transition-all duration-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            {primaryLink.label}
          </a>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">
            Source link unavailable — try the Preview or search for this title
          </span>
        )}

        {otherLinks.map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>

      {formats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {formats.map(f => (
            <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">{f}</span>
          ))}
        </div>
      )}

      {previewOpen && (
        <BookPreviewModal book={book} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
