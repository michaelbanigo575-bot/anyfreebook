import Link from 'next/link';
import { BookCover } from './BookCover';
import { formatCount, type Book } from '@/lib/data';

interface BookCardProps {
  book: Book;
  size?: 'compact' | 'standard' | 'featured';
  priority?: boolean;
}

export function BookCard({ book, size = 'standard', priority }: BookCardProps) {
  const coverSize = size === 'compact' ? 'sm' : size === 'featured' ? 'lg' : 'md';
  // Live-sourced books link straight to the actual book online; curated ones
  // go to our detail page (which resolves real download links).
  const isExternal = !!book.sourceUrl && !!book.sourceType && book.sourceType !== 'local';
  const href = isExternal ? book.sourceUrl! : `/book/${book.slug}`;
  const contentTypeBadge = {
    AUDIOBOOK: { emoji: '🎧', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
    COMIC: { emoji: '🦸', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    NOVEL: { emoji: '📖', bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
    MAGAZINE: { emoji: '📰', bg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300' },
    BOOK: { emoji: '📚', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  }[book.contentType] || { emoji: '📚', bg: 'bg-blue-100 text-blue-700' };

  return (
    <article className="group relative">
      <Link
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={`
          block rounded-xl transition-all duration-300
          ${size === 'featured'
            ? 'p-5 bg-[var(--surface)] shadow-md hover:shadow-xl border border-[var(--border-subtle)]'
            : 'p-3 hover:bg-[var(--surface)] hover:shadow-lg'
          }
          ease-[var(--ease-out-expo)]
        `}
      >
        <div className={`flex ${size === 'featured' ? 'gap-5' : size === 'compact' ? 'flex-row gap-3' : 'flex-col gap-3'}`}>
          {/* Cover */}
          <div className="relative flex-shrink-0 self-center">
            <BookCover
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              size={coverSize}
              className="relative z-[1] transition-transform duration-300
                group-hover:-translate-y-1 group-hover:shadow-book-hover"
            />

            {/* Content type badge */}
            <span className={`
              absolute -top-1.5 -right-1.5 z-20 text-[10px] font-bold px-1.5 py-0.5
              rounded-full shadow-sm ${contentTypeBadge.bg}
            `}>
              {contentTypeBadge.emoji}
            </span>
          </div>

          {/* Info */}
          <div className={`flex flex-col min-w-0 flex-1 ${size === 'compact' ? 'justify-center' : ''}`}>
            <h3 className={`
              font-semibold text-[var(--text)] leading-snug
              ${size === 'featured' ? 'text-base line-clamp-2' : size === 'compact' ? 'text-sm line-clamp-1' : 'text-sm line-clamp-2'}
            `}>
              {book.title}
            </h3>

            <p className={`text-[var(--text-secondary)] mt-0.5 line-clamp-1 ${size === 'featured' ? 'text-sm' : 'text-xs'}`}>
              {book.author}
            </p>

            {/* Rating */}
            {book.rating > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg key={star} className={`w-3 h-3 ${
                      star <= Math.round(book.rating)
                        ? 'text-amber-400'
                        : 'text-neutral-300 dark:text-neutral-600'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {book.rating.toFixed(1)} ({formatCount(book.ratingCount)})
                </span>
              </div>
            )}

            {/* Formats + Stats */}
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {book.formats.map(format => (
                  <span key={format} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                    {format}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                <span>{formatCount(book.viewCount)} reads</span>
                <span>{formatCount(book.likeCount)} likes</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
