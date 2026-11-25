'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Placement, Sponsor } from '@/lib/sponsors/types';
import { storageGet, storageSet } from '@/lib/safeStorage';

type Spots = Partial<Record<Placement, Sponsor>>;
const SponsorContext = createContext<Spots>({});

/** Loads the live sponsors once for all three homepage spots. An empty spot renders nothing. */
export function SponsorProvider({ children }: { children: React.ReactNode }) {
  const [spots, setSpots] = useState<Spots>({});
  useEffect(() => {
    fetch('/api/sponsors').then(r => (r.ok ? r.json() : null)).then(d => d?.spots && setSpots(d.spots)).catch(() => {});
  }, []);
  return <SponsorContext.Provider value={spots}>{children}</SponsorContext.Provider>;
}

const REL = 'sponsored noopener noreferrer';

function track(id: string, event: 'view' | 'click') {
  // keepalive lets the request finish even when the click leaves the page
  fetch('/api/sponsors/track', {
    method: 'POST', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, event }),
  }).catch(() => {});
}

/**
 * A view counts only when at least half the ad is on screen for one second, once per ad per
 * browsing session. A click counts for any link inside the ad, including open-in-new-tab.
 */
function useTracked(id: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!id || !el || typeof IntersectionObserver === 'undefined') return;
    const key = `afb-ad-seen-${id}`;
    if (storageGet(key, 'session')) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (!entry.isIntersecting) return;
      timer = setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        observer.disconnect();
        storageSet(key, '1', 'session');
        track(id, 'view');
      }, 1000);
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [id]);

  const onClick = (e: React.MouseEvent) => {
    // button 0 = normal click, 1 = middle click
    if (id && e.button <= 1 && (e.target as HTMLElement).closest('a[href]')) track(id, 'click');
  };
  return { ref, onClick, onAuxClick: onClick };
}

function Out({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return href
    ? <a href={href} target="_blank" rel={REL} className={className}>{children}</a>
    : <div className={className}>{children}</div>;
}

/** Video never plays by itself: the reader presses play. */
function Media({ s, className }: { s: Sponsor; className: string }) {
  if (s.media_type === 'video') return <video src={s.media_url} controls muted playsInline preload="metadata" className={className} />;
  if (s.media_type !== 'image') return null;
  const img = <img src={s.media_url} alt={s.headline || s.sponsor_name} loading="lazy" className={className} />;
  return s.link_url ? <a href={s.link_url} target="_blank" rel={REL} className="block">{img}</a> : img;
}

const Label = ({ text }: { text: string }) => (
  <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[10px] font-bold">{text}</span>
);

/** Spot A: one quiet line under the search bar. The height is reserved so nothing jumps. */
export function SponsorLine() {
  const s = useContext(SponsorContext).support_line;
  const tracked = useTracked(s?.id);
  return (
    <div {...tracked} className="min-h-[24px] mt-3 text-xs text-[var(--text-muted)] flex flex-wrap items-center justify-center gap-1.5">
      {s && (
        <>
          <span>{s.headline || 'Free reading is supported by'}</span>
          <Out href={s.link_url} className="inline-flex items-center gap-1.5 font-semibold text-[var(--text)] hover:underline">
            {s.media_type === 'image' && <img src={s.media_url} alt="" className="h-5 max-w-[80px] object-contain" />}
            {s.sponsor_name}
          </Out>
        </>
      )}
    </div>
  );
}

/** Spot B: takes the place of the last feature tile, so the grid stays even. */
export function SponsorTile({ fallback }: { fallback: React.ReactNode }) {
  const s = useContext(SponsorContext).tile;
  const tracked = useTracked(s?.id);
  if (!s) return <>{fallback}</>;
  return (
    <div {...tracked} className="rounded-2xl border border-[var(--primary)] bg-[var(--surface)] p-4 overflow-hidden">
      <Label text="Sponsored" />
      <Media s={s} className="mt-2 w-full h-20 object-cover rounded-lg" />
      <Out href={s.link_url} className="block">
        <h3 className="text-sm font-bold text-[var(--text)] mt-2">{s.headline || s.sponsor_name}</h3>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{s.body}</p>
        {s.link_url && <span className="inline-block mt-1 text-[11px] font-semibold text-[var(--primary)]">{s.cta_label || 'Learn more'} →</span>}
      </Out>
    </div>
  );
}

/** Spot C: a sponsored shelf of useful free resources. */
export function SponsorShelf() {
  const s = useContext(SponsorContext).shelf;
  const tracked = useTracked(s?.id);
  if (!s) return null;
  return (
    <section className="content-wrapper py-6" aria-label={`Partner: ${s.sponsor_name}`}>
      <div {...tracked} className="rounded-2xl border border-[var(--primary)] bg-[var(--surface)] p-5 flex flex-col md:flex-row gap-5 md:items-center">
        {s.media_type !== 'none' && (
          <div className="md:w-72 flex-shrink-0">
            <Media s={s} className="w-full max-h-48 object-cover rounded-xl" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <Label text={`Partner · ${s.sponsor_name}`} />
          <h2 className="text-lg font-display font-bold text-[var(--text)] mt-2">{s.headline || s.sponsor_name}</h2>
          {s.body && <p className="text-sm text-[var(--text-secondary)] mt-1">{s.body}</p>}
          {s.extra_links?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {s.extra_links.map(l => (
                <a key={l.url + l.label} href={l.url} target="_blank" rel={REL} className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]">{l.label}</a>
              ))}
            </div>
          )}
        </div>
        {s.link_url && (
          <a href={s.link_url} target="_blank" rel={REL} className="self-start md:self-center px-4 py-2 rounded-xl border border-[var(--primary)] text-sm font-semibold text-[var(--primary)] whitespace-nowrap">{s.cta_label || 'Open shelf'} →</a>
        )}
      </div>
    </section>
  );
}
