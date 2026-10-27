'use client';

/**
 * The root error boundary.
 *
 * Without this, a client-side exception anywhere outside the five route
 * segments that have their own error.tsx showed Next.js's raw "Application
 * error: a client-side exception has occurred" page, which tells the reader
 * nothing and offers no way out.
 *
 * This is the last line of defence: the reader gets an explanation, a way
 * back, and the error is reported to /api/log-error so it shows up in the
 * client_errors table rather than vanishing.
 */
import { useEffect } from 'react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report it, but never let the report itself break the page.
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || 'Unhandled client exception',
          stack: error?.stack,
          url: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [error]);

  return (
    <div className="content-wrapper py-16 max-w-lg mx-auto text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="text-xl font-bold text-[var(--text)] mb-2">Something went wrong on this page</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        This part of the site ran into an error. The rest of the site is fine —
        try again, or go back to the front page.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-all"
        >
          Back to the home page
        </Link>
      </div>
      {error?.digest && (
        <p className="mt-6 text-[11px] text-[var(--text-muted)]">Reference: {error.digest}</p>
      )}
    </div>
  );
}
