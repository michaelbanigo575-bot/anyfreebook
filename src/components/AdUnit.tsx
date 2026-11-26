'use client';

import { useEffect, useRef } from 'react';

type AdSize = 'banner' | 'leaderboard' | 'sidebar' | 'inline' | 'footer';

const AD_DIMENSIONS: Record<AdSize, { width: number; height: number }> = {
  banner: { width: 728, height: 90 },
  leaderboard: { width: 970, height: 90 },
  sidebar: { width: 300, height: 250 },
  inline: { width: 336, height: 280 },
  footer: { width: 728, height: 90 },
};

/**
 * Slots already pushed on this page.
 *
 * AdSense's `adsbygoogle.push()` fills ONE `<ins>` element per call, and it
 * throws "All 'ins' elements in the DOM with class=adsbygoogle already have
 * ads in them" when it is called with no unfilled element left.
 *
 * A `useRef` per component is not enough: React can unmount and remount the
 * component (a `key` change, a route change, a fast refresh), the ref starts
 * empty again, and the second push throws. Tracking the pushed slots at module
 * scope means a slot is only ever pushed once per page load, whichever
 * component instance asks for it.
 */
const pushedSlots = new Set<string>();

interface AdUnitProps {
  size: AdSize;
  slot?: string;
  className?: string;
}

export function AdUnit({ size, slot, className = '' }: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const { width, height } = AD_DIMENSIONS[size];

  useEffect(() => {
    if (!slot || !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return;
    if (pushedSlots.has(slot)) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      // The AdSense script is loaded async, so the queue may not exist yet.
      if (!w.adsbygoogle) w.adsbygoogle = [];
      w.adsbygoogle.push({});
      pushedSlots.add(slot);
    } catch {
      // AdSense refusing to fill an ad is not worth breaking the page over.
    }
  }, [slot]);

  // Nothing to show: render nothing rather than an empty placeholder box
  if (!slot || !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return null;

  return (
    <div
      ref={adRef}
      className={`flex items-center justify-center mx-auto w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] ${className}`}
      style={{ maxWidth: width, minHeight: height }}
    >
      {slot && process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', maxWidth: width, height }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-[var(--text-muted)] py-4">
          <span className="text-xs font-medium uppercase tracking-wider opacity-50">Advertisement</span>
          <span className="text-[10px] mt-1 opacity-30">{width} x {height}</span>
        </div>
      )}
    </div>
  );
}
