'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Loads the next batch as the reader nears the end. The link still works without it. */
export function AutoLoadMore({ href }: { href: string }) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      start(() => router.replace(href, { scroll: false }));
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [href, router]);

  return (
    <div className="text-center mt-6">
      <a ref={ref} href={href} className="inline-flex items-center min-h-[44px] px-8 rounded-xl border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold">
        {pending ? 'Loading…' : 'Load more'}
      </a>
    </div>
  );
}
