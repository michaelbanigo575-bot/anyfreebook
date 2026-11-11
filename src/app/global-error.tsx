'use client';

/**
 * The last-resort boundary: an error in the root layout itself.
 *
 * Next.js renders this instead of the root layout, so it cannot use the
 * site's header, fonts or theme — it has to stand on its own with inline
 * styles.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // A deploy removes old script files; an open or cached page then fails to load them.
    // One automatic reload fetches the fresh page (guarded so it can never loop).
    try {
      const msg = String(error?.message || '');
      if (/Loading chunk|ChunkLoadError|Failed to fetch dynamically imported|is not a function|reading 'get'/i.test(msg)
          && !sessionStorage.getItem('afb-reloaded')) {
        sessionStorage.setItem('afb-reloaded', '1');
        window.location.reload();
        return;
      }
    } catch { /* ignore */ }
    // Root-layout crashes were invisible: report them like every other client error.
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'ROOT: ' + (error?.message || 'Unhandled root exception'),
          stack: error?.stack,
          url: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#0a0f1a',
          color: '#f1f5f9',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>ANYFREEBOOK could not load this page</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
            Something went wrong while rendering the site. This is a problem on our
            side, not yours — please try again.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: 0,
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Back to the home page
            </a>
          </div>
          {error?.digest && (
            <p style={{ marginTop: 24, fontSize: 11, color: '#64748b' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
