'use client';

import { useEffect, useRef, useState } from 'react';

interface StatBlockProps {
  number: string;
  label: string;
}

export function StatBlock({ number, label }: StatBlockProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <p className="text-3xl md:text-5xl font-display font-bold gradient-text">
        {number}
      </p>
      <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">{label}</p>
    </div>
  );
}
