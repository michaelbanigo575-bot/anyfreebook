'use client';

import { useEffect, useState } from 'react';

/**
 * A clock that only starts after the component mounts on the client.
 *
 * Rendering `Date.now()` directly during render is a hydration bug: the server
 * and the browser compute different relative times ("2m ago" vs "3m ago"), React
 * logs a hydration mismatch, and the client silently re-renders. Returning
 * `null` on the first render lets callers show a stable placeholder instead.
 *
 * Returns a timestamp that refreshes on `intervalMs` so relative labels like
 * "5m ago" keep counting up without a manual reload.
 */
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (intervalMs <= 0) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}