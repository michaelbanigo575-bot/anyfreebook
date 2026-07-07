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

interface AdUnitProps {
  size: AdSize;
  slot?: string;
  className?: string;
}

export function AdUnit({ size, slot, className = '' }: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const { width, height } = AD_DIMENSIONS[size];

  useEffect(() => {
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle;
      if (adsbygoogle) adsbygoogle.push({});
    } catch {}
  }, []);

  return (
    <div
      ref={adRef}
      className={`flex items-center justify-center mx-auto overflow-hidden rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] ${className}`}
      style={{ maxWidth: width, minHeight: height }}
    >
      {slot && process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width, height }}
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

export function SponsoredBooks() {
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Sponsored</p>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer">
            <div className="w-10 h-14 rounded bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] opacity-60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-3/4 rounded bg-[var(--border)] mb-1.5" />
              <div className="h-2.5 w-1/2 rounded bg-[var(--border-subtle)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
