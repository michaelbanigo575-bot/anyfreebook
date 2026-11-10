import Link from 'next/link';
import { BookCover } from './BookCover';
import { formatCount, type Book } from '@/lib/data';
import { cardClass } from '@/lib/ui';
import { TiltCard } from './TiltCard';

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
  const typeMeta = {
    AUDIOBOOK: { label: 'Audiobook', emoji: '🎧', tone: 'text-purple-600 dark:text-purple-300' },
    COMIC: { label: 'Comic', emoji: '🦸', tone: 'text-amber-600 dark:text-amber-300' },
    NOVEL: { label: 'Novel', emoji: '📖', tone: 'text-rose-600 dark:text-rose-300' },
    MAGAZINE: { label: 'Magazine', emoji: '📰', tone: 'text-teal-600 dark:text-teal-300' },
    BOOK: { label: 'Book', emoji: '📚', tone: 'text-blue-600 dark:text-blue-300' },
  }[book.contentType] || { label: 'Book', emoji: '📚', tone: 'text-blue-600 dark:text-blue-300' };
  const shownFormats = book.formats.slice(0, 3);
  const extraFormats = book.formats.length - shownFormats.length;

  return (
    <article className="group relative h-full">
      <TiltCard>
      <Link
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={`
          block h-full outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
          ${size === 'featured'
            ? cardClass({ padding: 'p-5' })
            : 'rounded-2xl p-2 border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--surface)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-300'
          }
          ease-[var(--ease-out-expo)]
        `}
      >
        <div className={`flex ${size === 'featured' ? 'gap-5' : size === 'compact' ? 'flex-row gap-3' : 'flex-col gap-2'}`}>
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
          </div>

          {/* Info */}
          <div className={`flex flex-col min-w-0 flex-1 ${size === 'compact' ? 'justify-center' : ''}`}>
            <span className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${typeMeta.tone}`}>
              <span aria-hidden>{typeMeta.emoji}</span> {typeMeta.label}
            </span>
            <h3 className={`
              font-semibold text-[var(--text)] leading-snug
              ${size === 'featured' ? 'text-base line-clamp-2' : size === 'compact' ? 'text-sm line-clamp-1' : 'text-[13px] line-clamp-2'}
            `}>
              {book.title}
            </h3>

            <p className={`text-[var(--text-secondary)] mt-0.5 line-clamp-1 ${size === 'featured' ? 'text-sm' : 'text-xs'}`}>
              {book.author}
            </p>

            {/* Rating */}
            {book.rating > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--text-muted)]" aria-label={`Rated ${book.rating.toFixed(1)} out of 5`}>
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span className="font-semibold text-[var(--text-secondary)]">{book.rating.toFixed(1)}</span>
                <span>({formatCount(book.ratingCount)})</span>
              </div>
            )}

            {/* Formats + Stats */}
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {shownFormats.map(format => (
                  <span key={format} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                    {format}
                  </span>
                ))}
                {extraFormats > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-[var(--text-muted)]">+{extraFormats}</span>
                )}
              </div>
              {/* Engagement stats render only when the source gave us real
                  numbers. 0 means "unknown", not "zero" — never print 0 reads. */}
              {(book.viewCount > 0 || book.likeCount > 0) && (
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                  {book.viewCount > 0 && <span>{formatCount(book.viewCount)} reads</span>}
                  {book.likeCount > 0 && <span>{formatCount(book.likeCount)} likes</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
      </TiltCard>
    </article>
  );
}
