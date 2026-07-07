'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV_COUNT_KEY = 'afb_nav_count';

/** Where to send the user if there's no in-app history to go back to (e.g. they landed here directly). */
function getFallbackPath(pathname: string): string {
  if (pathname.startsWith('/book/')) return '/search';
  if (pathname.startsWith('/category/')) return '/explore';
  if (pathname.startsWith('/collection/')) return '/collections';
  if (pathname.startsWith('/list/')) return '/my-collections';
  if (pathname === '/login' || pathname === '/profile') return '/';
  return '/';
}

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let count = parseInt(sessionStorage.getItem(NAV_COUNT_KEY) || '0', 10);

    if (lastPathRef.current !== null && lastPathRef.current !== pathname) {
      count += 1;
      sessionStorage.setItem(NAV_COUNT_KEY, String(count));
    }
    lastPathRef.current = pathname;
    setCanGoBack(count > 0);
  }, [pathname]);

  if (pathname === '/') return null;

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(getFallbackPath(pathname));
    }
  };

  return (
    <div className="content-wrapper pt-4">
      <button
        onClick={handleBack}
        aria-label="Go back"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>
    </div>
  );
}
