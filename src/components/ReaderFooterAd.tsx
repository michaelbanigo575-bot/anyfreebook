'use client';

import { useState, useEffect, useRef } from 'react';
import { AdUnit } from './AdUnit';

const DISMISS_KEY = 'afb_reader_ad_dismissed';
const READ_SECONDS_QUOTA = 25; // show only after genuine reading time, not on arrival
const SCROLL_QUOTA_PCT = 40;

/**
 * A slim, native-styled ad bar pinned to the bottom of the viewport — not
 * inline in the reading column. Stays hidden until the reader has actually
 * spent time reading (dwell time + scroll), matching a "generous free quota
 * before any ad appears" policy. Dismissible for the rest of the session.
 */
export function ReaderFooterAd({ slot }: { slot?: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') { setDismissed(true); return; }

    let maxScroll = 0;
    const check = () => {
      const seconds = (Date.now() - startRef.current) / 1000;
      const doc = document.documentElement;
      const scrollPct = doc.scrollHeight > doc.clientHeight
        ? (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100
        : 100;
      maxScroll = Math.max(maxScroll, scrollPct);

      if (seconds >= READ_SECONDS_QUOTA && maxScroll >= SCROLL_QUOTA_PCT) {
        setVisible(true);
      }
    };

    const onScroll = () => check();
    window.addEventListener('scroll', onScroll, { passive: true });
    const interval = setInterval(check, 3000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(interval);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  if (dismissed || !visible || !slot) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md animate-fade-in">
      <div className="rounded-xl bg-[var(--surface)]/95 backdrop-blur border border-[var(--border)] shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-subtle)]">
          <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">Sponsored</span>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-0.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-2 flex justify-center">
          <AdUnit size="inline" slot={slot} className="border-0" />
        </div>
      </div>
    </div>
  );
}
