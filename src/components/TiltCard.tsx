'use client';

import { useRef, type ReactNode } from 'react';

/**
 * 3D "pop-up" wrapper: the card tilts toward the pointer, lifts off the page
 * and a soft glare follows the cursor. Pure CSS variables, no re-renders.
 * Disabled on touch screens and for reduced-motion users (see globals.css).
 */
export function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${((px - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${((0.5 - py) * 14).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt-card ${className}`}>
      {children}
      <span className="tilt-glare" aria-hidden />
    </div>
  );
}
