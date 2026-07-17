'use client';

import { useEffect } from 'react';

/**
 * Own error monitoring: reports uncaught errors and unhandled promise
 * rejections to /api/log-error (max 5 per page load, deduped) so problems
 * users hit in the wild show up in the client_errors table instead of
 * vanishing silently.
 */
export function ErrorMonitor() {
  useEffect(() => {
    let sent = 0;
    const seen = new Set<string>();

    const report = (message: string, stack?: string) => {
      if (sent >= 5 || seen.has(message) || !message) return;
      // Noise filter: extension junk and cross-origin opaque errors
      if (/extension|ResizeObserver loop|Script error\.?$/i.test(message)) return;
      seen.add(message);
      sent++;
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, stack, url: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    };

    const onError = (e: ErrorEvent) => report(e.message, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(r?.message || String(r).slice(0, 300), r?.stack);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
