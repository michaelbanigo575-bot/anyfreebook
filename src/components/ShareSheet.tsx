'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** A popup with the page dimmed and blurred behind it. Slides up on phones, centres on desktop. */
export function FocusPopup({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab' || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const outside = !panel.current.contains(document.activeElement) || document.activeElement === panel.current;
      if (e.shiftKey && (outside || document.activeElement === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 focus-veil animate-fade-in" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-2xl p-4 animate-slide-up outline-none"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <span aria-hidden className="sm:hidden block w-10 h-1.5 rounded-full bg-[var(--border)] mx-auto mb-3" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

const row = 'flex items-center gap-3 w-full min-h-[52px] px-2 rounded-xl text-left text-[15px] font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]';

function Glyph({ d }: { d: string }) {
  return (
    <span aria-hidden className="w-9 h-9 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}

export function ShareSheet({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const [note, setNote] = useState('');
  const url = `${window.location.origin}${path}`;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNote('Link copied'); }
    catch { setNote(url); }
  };

  return (
    <FocusPopup label="Share" onClose={onClose}>
      <p className="font-serif-title text-lg font-bold text-[var(--text)] mb-2 line-clamp-1">Share “{title}”</p>
      <button className={row} onClick={copy}><Glyph d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />Copy link</button>
      <a className={row} target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} onClick={onClose}><Glyph d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z" />WhatsApp</a>
      <a className={row} target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} onClick={onClose}><Glyph d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />Facebook</a>
      {canShare && <button className={row} onClick={() => { navigator.share({ title, url }).then(onClose).catch(() => {}); }}><Glyph d="M5 12h.01M12 12h.01M19 12h.01" />More options</button>}
      {note && <p role="status" className="mt-2 text-sm text-[var(--primary)] break-all">{note}</p>}
    </FocusPopup>
  );
}

/** A share button that opens the sheet. */
export function ShareButton({ path, title, className, children }: { path: string; title: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      {open && <ShareSheet path={path} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
