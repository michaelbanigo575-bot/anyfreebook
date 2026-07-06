'use client';

import { useRef } from 'react';
import { BookCard } from './BookCard';
import type { Book } from '@/lib/data';

interface BookGridProps {
  books: Book[];
  layout: 'grid' | 'list' | 'shelf' | 'carousel';
}

export function BookGrid({ books, layout }: BookGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  if (layout === 'carousel' || layout === 'shelf') {
    return (
      <div className="relative group/carousel">
        <div
          ref={scrollRef}
          className="flex gap-2 md:gap-4 overflow-x-auto pb-4 px-1 pt-1 snap-x snap-mandatory scrollbar-none scroll-smooth"
        >
          {books.map((book, i) => (
            <div key={book.id} className="snap-start flex-shrink-0 w-[160px] sm:w-[180px] md:w-[210px]">
              <BookCard book={book} priority={i < 5} />
            </div>
          ))}
        </div>

        {layout === 'shelf' && (
          <div className="h-[3px] bg-gradient-to-b from-neutral-200 to-transparent dark:from-neutral-700 rounded-full mx-4" />
        )}

        {/* Scroll arrows */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-10 h-10 rounded-full bg-[var(--surface)] shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:scale-110 border border-[var(--border)]"
          aria-label="Scroll left"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-10 h-10 rounded-full bg-[var(--surface)] shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:scale-110 border border-[var(--border)]"
          aria-label="Scroll right"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-4 w-6 bg-gradient-to-r from-[var(--bg)] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-4 w-6 bg-gradient-to-l from-[var(--bg)] to-transparent pointer-events-none" />
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="divide-y divide-[var(--border-subtle)]">
        {books.map((book, i) => (
          <div key={book.id} className="py-2">
            <BookCard book={book} size="compact" priority={i < 8} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((book, i) => (
        <BookCard key={book.id} book={book} priority={i < 8} />
      ))}
    </div>
  );
}
