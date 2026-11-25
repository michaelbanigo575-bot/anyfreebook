'use client';

import { useState } from 'react';
import { BookPreviewModal, getReaderTarget } from './BookPreviewModal';
import type { Book } from '@/lib/data';

interface BookReadActionsProps {
  book: Book;
  formats: string[];
}

export function BookReadActions({ book, formats }: BookReadActionsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const readable = !!getReaderTarget(book);
  const primaryLink = book.downloadLinks?.[0];
  const links = readable ? book.downloadLinks || [] : book.downloadLinks?.slice(1) || [];
  const main = 'flex flex-1 items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold';

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 max-w-md">
        {readable ? (
          <button type="button" onClick={() => setPreviewOpen(true)} className={main}>Read free</button>
        ) : primaryLink ? (
          <a href={primaryLink.url} target="_blank" rel="noopener noreferrer" className={main}>{primaryLink.label}</a>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">No readable copy found yet. Try searching for this title.</span>
        )}
      </div>
      {readable && <p className="mt-2 text-xs text-[var(--text-muted)]">Opens in the ANYFREEBOOK Reader.</p>}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {links.map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center min-h-[40px] px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
              {link.label}
            </a>
          ))}
        </div>
      )}

      {formats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {formats.map(f => (
            <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">{f}</span>
          ))}
        </div>
      )}

      {previewOpen && <BookPreviewModal book={book} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
