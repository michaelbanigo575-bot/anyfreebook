'use client';

import { useEffect, useRef, useState } from 'react';
import type { Placement, Sponsor } from '@/lib/sponsors/types';
import { storageGet, storageSet } from '@/lib/safeStorage';

type Pools = Partial<Record<Placement, Sponsor[]>>;

// One request is shared by every ad container on the page, and refreshed after a minute
let cache: { at: number; request: Promise<Pools> } | null = null;

function loadPools(): Promise<Pools> {
  if (!cache || Date.now() - cache.at > 60_000) {
    cache = {
      at: Date.now(),
      request: fetch('/api/sponsors')
        .then(r => (r.ok ? r.json() : null))
        .then(d => (d?.pools || {}) as Pools)
        .catch(() => { cache = null; return {} as Pools; }),
    };
  }
  return cache.request;
}

const ROTATE_MS = 9000;
let visitStart: number | null = null;

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

/**
 * The ad a container is showing. It moves to the next one every few seconds, but only while the
 * ad is on screen and nobody is using it: it holds still on hover, keyboard focus, a playing
 * video or a hidden tab, stops once the reader picks one, and never moves for readers who ask for
 * reduced motion. Each container starts at a different point so they show different features.
 */
function useRotatingAd(placement: Placement, offset: number) {
  const [pool, setPool] = useState<Sponsor[]>([]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(false);
  const holder = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    if (visitStart === null) visitStart = Math.floor(Math.random() * 12);
    loadPools().then(p => { if (mounted) setPool(p[placement] || []); });
    return () => { mounted = false; };
  }, [placement]);

  const index = pool.length ? ((visitStart || 0) + offset + step) % pool.length : 0;
  const ad: Sponsor | undefined = pool[index];
  const tracked = useTracked(ad?.id);

  useEffect(() => {
    if (pool.length < 2 || picked) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      const el = holder.current;
      if (!el || document.visibilityState !== 'visible') return;
      if (el.matches(':hover') || el.contains(document.activeElement)) return;
      const video = el.querySelector('video');
      if (video && !video.paused) return;
      const box = el.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight) return;
      setStep(n => n + 1);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [pool.length, picked]);

  const ref = (el: HTMLDivElement | null) => {
    holder.current = el;
    (tracked.ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
  const pick = (i: number) => { setPicked(true); setStep(n => n + ((i - index + pool.length) % pool.length)); };

  return { ad, index, count: pool.length, pick, box: { ref, onClick: tracked.onClick, onAuxClick: tracked.onAuxClick } };
}

function Dots({ count, index, pick }: { count: number; index: number; pick: (i: number) => void }) {
  if (count < 2) return null;
  return (
    <div className="flex items-center">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" onClick={() => pick(i)} aria-label={`Show ad ${i + 1} of ${count}`} aria-current={i === index} className="p-1.5">
          <span className={`block h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-[var(--primary)]' : 'w-1.5 bg-[var(--text-muted)]'}`} />
        </button>
      ))}
    </div>
  );
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
  const { ad: s, box } = useRotatingAd('support_line', 0);
  return (
    <div {...box} className="min-h-[40px] sm:min-h-[24px] mt-3 text-xs text-[var(--text-muted)] flex flex-wrap items-center justify-center gap-1.5">
      {s && (
        <span key={s.id} className="flex flex-wrap items-center justify-center gap-1.5 animate-fade-in">
          <span>{s.headline || 'Free reading is supported by'}</span>
          <Out href={s.link_url} className="inline-flex items-center gap-1.5 font-semibold text-[var(--text)] hover:underline">
            {s.media_type === 'image' && <img src={s.media_url} alt="" className="h-5 max-w-[80px] object-contain" />}
            {s.sponsor_name}
          </Out>
        </span>
      )}
    </div>
  );
}

/** Spot B: takes the place of the last feature tile, so the grid stays even. */
export function SponsorTile({ fallback }: { fallback: React.ReactNode }) {
  const { ad: s, box } = useRotatingAd('tile', 2);
  if (!s) return <>{fallback}</>;
  return (
    <div {...box} className="rounded-2xl border border-[var(--primary)] bg-[var(--surface)] p-4 overflow-hidden">
      <div key={s.id} className="animate-fade-in">
        {/* A picture sits at icon size so the tile stays as tall as its neighbours */}
        <div className="flex items-center justify-between gap-2">
          {s.media_type === 'image' ? <Media s={s} className="w-9 h-9 object-cover rounded-lg" /> : <span />}
          <Label text="Sponsored" />
        </div>
        {s.media_type === 'video' && <Media s={s} className="mt-2 w-full h-20 object-cover rounded-lg" />}
        <Out href={s.link_url} className="block">
          <h3 className="text-sm font-bold text-[var(--text)] mt-2 line-clamp-2">{s.headline || s.sponsor_name}</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed line-clamp-3">{s.body}</p>
          {s.link_url && <span className="inline-block mt-1 text-[11px] font-semibold text-[var(--primary)]">{s.cta_label || 'Learn more'} →</span>}
        </Out>
      </div>
    </div>
  );
}

/** Spot C: the wide sponsored shelf on the homepage. */
export function SponsorShelf() {
  const { ad: s, box, index, count, pick } = useRotatingAd('shelf', 4);
  if (!s) return null;
  return (
    <section className="content-wrapper py-6" aria-label={`Partner: ${s.sponsor_name}`}>
      <div {...box} className="rounded-2xl border border-[var(--primary)] bg-[var(--surface)] p-5">
        <div key={s.id} className="flex flex-col md:flex-row gap-5 md:items-center md:min-h-[176px] animate-fade-in">
          {s.media_type !== 'none' && (
            <div className="md:w-72 flex-shrink-0">
              <Media s={s} className="w-full h-40 object-cover rounded-xl" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Label text={`Partner · ${s.sponsor_name}`} />
            <h2 className="text-lg font-display font-bold text-[var(--text)] mt-2 line-clamp-2">{s.headline || s.sponsor_name}</h2>
            {s.body && <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-3">{s.body}</p>}
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
        <div className="flex justify-center mt-2"><Dots count={count} index={index} pick={pick} /></div>
      </div>
    </section>
  );
}

/** A compact version of the shelf for other pages. It sits after the content the reader came for. */
export function SponsorStrip({ offset = 0 }: { offset?: number }) {
  const { ad: s, box, index, count, pick } = useRotatingAd('shelf', offset);
  if (!s) return null;
  return (
    <aside className="my-10" aria-label={`Sponsored: ${s.sponsor_name}`}>
      <div {...box} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div key={s.id} className="flex items-start sm:items-center gap-4 min-h-[88px] animate-fade-in">
          {s.media_type === 'image' && <Media s={s} className="w-16 h-16 sm:w-28 sm:h-20 object-cover rounded-xl flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <Label text={`Sponsored · ${s.sponsor_name}`} />
            <p className="text-sm font-bold text-[var(--text)] mt-1.5 line-clamp-2">{s.headline || s.sponsor_name}</p>
            {s.body && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{s.body}</p>}
            {s.link_url && <a href={s.link_url} target="_blank" rel={REL} className="inline-block py-1.5 text-xs font-semibold text-[var(--primary)]">{s.cta_label || 'Learn more'} →</a>}
          </div>
        </div>
        <div className="flex justify-end"><Dots count={count} index={index} pick={pick} /></div>
      </div>
    </aside>
  );
}
