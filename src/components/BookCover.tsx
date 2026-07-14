'use client';

import { useState } from 'react';

const PLACEHOLDER_COLORS = [
  'from-blue-600 to-blue-800',
  'from-emerald-600 to-emerald-800',
  'from-purple-600 to-purple-800',
  'from-amber-600 to-amber-800',
  'from-rose-600 to-rose-800',
  'from-cyan-600 to-cyan-800',
  'from-indigo-600 to-indigo-800',
  'from-teal-600 to-teal-800',
];

const SIZES = {
  xs:   { w: 48,  h: 72,  d: 8  },
  sm:   { w: 80,  h: 120, d: 12 },
  md:   { w: 128, h: 192, d: 18 },
  lg:   { w: 200, h: 300, d: 26 },
  xl:   { w: 280, h: 420, d: 34 },
};

interface BookCoverProps {
  title: string;
  author: string;
  size: keyof typeof SIZES;
  coverUrl?: string | null;
  className?: string;
  /** Disable the 3D hover spin (e.g. inside a modal or when the cover is decorative). */
  flat?: boolean;
}

/** Force https so mixed-content covers (e.g. Google Books http thumbnails) aren't blocked. */
function secureUrl(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

export function BookCover({ title, author, size, coverUrl, className = '', flat = false }: BookCoverProps) {
  const dim = SIZES[size];
  const [imgError, setImgError] = useState(false);
  const colorIndex = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PLACEHOLDER_COLORS.length;
  const hasImage = !!coverUrl && !imgError;

  const titleSize = size === 'xs' ? 'text-[8px]' : size === 'sm' ? 'text-[10px]' : 'text-xs';
  const authorSize = size === 'xs' ? 'text-[7px]' : size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  // The front-cover content: the real book image, or a styled placeholder that still reads as a cover
  const Front = hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={secureUrl(coverUrl!)}
      alt={`Cover of "${title}" by ${author}`}
      // no loading="lazy": lazy images inside 3D-transformed faces never intersect in Chrome
      onError={() => setImgError(true)}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className={`w-full h-full bg-gradient-to-br ${PLACEHOLDER_COLORS[colorIndex]} flex flex-col justify-end`}>
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="absolute top-3 left-2 right-2 h-[0.5px] bg-white/15" />
      <div className="relative z-10 p-2">
        <p className={`text-white font-semibold leading-tight line-clamp-3 ${titleSize}`}>{title}</p>
        <p className={`text-white/60 mt-0.5 line-clamp-1 ${authorSize}`}>{author}</p>
      </div>
    </div>
  );

  // Flat mode: just the front cover, no 3D box (used where a spinning book would be distracting)
  if (flat) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg shadow-book ${className}`}
        style={{ width: dim.w, height: dim.h }}
        role="img"
        aria-label={`Cover of "${title}" by ${author}`}
      >
        {Front}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className={`book3d-scene shadow-book rounded-lg ${className}`}
      style={{ width: dim.w, height: dim.h, ['--book-d' as string]: `${dim.d}px` }}
      role="img"
      aria-label={`Cover of "${title}" by ${author}`}
      title={`${title} — ${author}`}
    >
      <div className="book3d">
        {/* Front — real cover or placeholder */}
        <div className="book3d-face book3d-front">
          {Front}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
        </div>
        {/* Spine (left side) */}
        <div className={`book3d-face book3d-spine bg-gradient-to-b ${PLACEHOLDER_COLORS[colorIndex]}`}>
          <div className="w-full h-full bg-black/30" />
        </div>
        {/* Pages (right side) */}
        <div className="book3d-face book3d-pages bg-gradient-to-l from-neutral-200 to-white dark:from-neutral-400 dark:to-neutral-200" />
        {/* Back cover */}
        <div className={`book3d-face book3d-back bg-gradient-to-br ${PLACEHOLDER_COLORS[colorIndex]}`}>
          <div className="w-full h-full bg-black/20 flex items-center justify-center p-2">
            <p className={`text-white/70 text-center leading-tight line-clamp-4 ${authorSize}`}>{title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
