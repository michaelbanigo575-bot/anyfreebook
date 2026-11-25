'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface Neighbour { slug: string; title: string }

/**
 * The cover stage at the top of a book page. Swipe it left or right to move to the next or
 * previous book. Sideways only, so swiping up still scrolls the page as people expect.
 */
export function BookStage({ prev, next, children }: { prev: Neighbour | null; next: Neighbour | null; children: React.ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);
  const arrow = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white text-2xl flex items-center justify-center hover:bg-white/25';

  return (
    <div
      className="relative -mx-4 sm:mx-0 sm:rounded-2xl flex justify-center py-5 bg-gradient-to-b from-[#0A1F4A] to-[#00486B] touch-pan-y"
      onTouchStart={e => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        if (!start.current) return;
        const dx = e.changedTouches[0].clientX - start.current.x;
        const dy = e.changedTouches[0].clientY - start.current.y;
        start.current = null;
        if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const target = dx < 0 ? next : prev;
        if (target) router.push(`/book/${target.slug}`);
      }}
    >
      {children}
      {prev && <Link href={`/book/${prev.slug}`} aria-label={`Previous book: ${prev.title}`} className={`${arrow} left-3`}>‹</Link>}
      {next && <Link href={`/book/${next.slug}`} aria-label={`Next book: ${next.title}`} className={`${arrow} right-3`}>›</Link>}
    </div>
  );
}
