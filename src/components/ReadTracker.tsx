'use client';

import { useEffect, useRef } from 'react';
import { recordView, recordRead } from '@/lib/creators/client';

/**
 * Tracks a genuine read: time-on-page + max scroll depth. Sends the raw view
 * once, then periodically flushes engagement. The DB marks it "verified" at
 * >=30s and >=50% scroll — that's what drives creator payouts, so bot/skim
 * traffic doesn't inflate earnings.
 */
export function ReadTracker({ slug }: { slug: string }) {
  const startRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const activeSecRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const sentVerifiedRef = useRef(false);

  useEffect(() => {
    recordView(slug);

    const computeScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable <= 0 ? 100 : Math.min(100, Math.round((doc.scrollTop / scrollable) * 100));
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };
    computeScroll();
    window.addEventListener('scroll', computeScroll, { passive: true });

    // Count only active (visible) seconds
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        activeSecRef.current += (Date.now() - lastTickRef.current) / 1000;
      }
      lastTickRef.current = Date.now();

      // Flush a verified read as soon as thresholds are met (once), then keep updating on unload
      if (!sentVerifiedRef.current && activeSecRef.current >= 30 && maxScrollRef.current >= 50) {
        sentVerifiedRef.current = true;
        recordRead(slug, activeSecRef.current, maxScrollRef.current);
      }
    }, 1000);

    const flush = () => {
      recordRead(slug, activeSecRef.current, maxScrollRef.current);
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    return () => {
      window.removeEventListener('scroll', computeScroll);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      clearInterval(tick);
      flush();
    };
  }, [slug]);

  return null;
}
