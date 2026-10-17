import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookCover } from '@/components/BookCover';
import { BookGrid } from '@/components/BookGrid';
import { SectionHeader } from '@/components/SectionHeader';
import { getBookBySlug, getBooksByCategory, formatCount, getAllBooks, type Book } from '@/lib/data';
import { BookInteractionButtons } from '@/components/BookInteractions';
import { BookReadActions } from '@/components/BookReadActions';
import { bookSchema, breadcrumbSchema } from '@/lib/schema';
import { BookDetailClient } from '@/components/BookDetailClient';
import { resolveBookSource, type SourceTier } from '@/lib/api/resolveSource';
import { AdUnit } from '@/components/AdUnit';
import { getFreeAlternative, getBlogAlternativeSlug } from '@/lib/freeAlternatives';

export async function generateStaticParams() {
  return getAllBooks().map(book => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const book = getBookBySlug(params.slug);
  if (!book) return {};

  const tier = await getSourceTier(book);
  const claim = tier === 'download' ? 'Free Download' : tier === 'borrow' ? 'Borrow Free Online' : 'Where to Find It Free';
  const audioClaim = book.contentType === 'AUDIOBOOK' ? claim.replace('Download', 'Audiobook') : claim;

  return {
    title: `${book.title} by ${book.author} — ${audioClaim}`,
    description: tier === 'download'
      ? `Read or download "${book.title}" by ${book.author} for free in ${book.formats.join(', ')} format. ${book.description}`
      : tier === 'borrow'
      ? `Borrow "${book.title}" by ${book.author} free from Internet Archive's lending library. ${book.description}`
      : `Search legal, open-access sources for "${book.title}" by ${book.author}. ${book.description}`,
    openGraph: {
      title: `${book.title} — ${claim}`,
      description: book.description,
      type: 'book',
      images: [{ url: `/api/og?title=${encodeURIComponent(book.title)}&subtitle=${encodeURIComponent(`by ${book.author} — ${claim}`)}&type=book`, width: 1200, height: 630 }],
    },
  };
}

/** The book's own resolved source tier, without mutating it (used by both metadata and the page body — Next dedupes the underlying fetches). */
async function getSourceTier(book: Book): Promise<SourceTier> {
  if (book.sourceUrl || (book.downloadLinks && book.downloadLinks.length > 0)) return 'download'; // already a verified live-aggregated source
  const resolved = await resolveBookSource(book.title, book.author);
  return resolved?.tier || 'unverified';
}

export default async function BookPage({ params }: { params: { slug: string } }) {
  const localBook = getBookBySlug(params.slug);
  if (!localBook) notFound();

  let book = localBook;
  let tier: SourceTier = 'download'; // default: already a verified live-aggregated source
  if (!book.sourceUrl && (!book.downloadLinks || book.downloadLinks.length === 0)) {
    const resolved = await resolveBookSource(book.title, book.author);
    if (resolved) {
      book = { ...book, sourceUrl: resolved.sourceUrl, sourceType: resolved.sourceType, downloadLinks: resolved.downloadLinks };
      tier = resolved.tier;
    } else {
      tier = 'unverified';
    }
  }

  const relatedBooks = getBooksByCategory(book.category.slug)
    .filter(b => b.id !== book.id)
    .slice(0, 6);

  const schemas = [
    bookSchema(book, tier),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: book.category.name, path: `/category/${book.category.slug}` },
      { name: book.title, path: `/book/${book.slug}` },
    ]),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script key={`schema-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <div className="content-wrapper py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
          <a href="/" className="hover:text-[var(--text)] transition-colors">Home</a>
          <span>/</span>
          <a href={`/category/${book.category.slug}`} className="hover:text-[var(--text)] transition-colors">{book.category.name}</a>
          <span>/</span>
          <span className="text-[var(--text-secondary)] line-clamp-1">{book.title}</span>
        </nav>

        {/* Book detail */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Cover */}
          <div className="flex-shrink-0 self-center md:self-start">
            <div className="relative">
              <div className="absolute -right-[3px] top-2 bottom-2 w-[6px]
                bg-gradient-to-l from-neutral-300 via-neutral-200 to-neutral-100
                dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-400
                rounded-r-sm" />
              <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} size="xl" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary-light)] text-[var(--primary)] mb-3">
              {book.contentType === 'AUDIOBOOK' ? '🎧 Audiobook' : book.contentType === 'COMIC' ? '🦸 Comic' : '📚 Book'}
            </span>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-[var(--text)] leading-tight">
              {book.title}
            </h1>

            <p className="text-lg text-[var(--text-secondary)] mt-2">
              by <span className="font-medium text-[var(--text)]">{book.author}</span>
            </p>

            {/* Rating */}
            {book.rating > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg key={star} className={`w-5 h-5 ${
                      star <= Math.round(book.rating)
                        ? 'text-amber-400'
                        : 'text-neutral-300 dark:text-neutral-600'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-[var(--text)]">{book.rating.toFixed(1)}</span>
                <span className="text-sm text-[var(--text-muted)]">({formatCount(book.ratingCount)} ratings)</span>
              </div>
            )}

            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[var(--text-muted)]">
              {book.viewCount > 0 && <span>{formatCount(book.viewCount)} reads</span>}
              {book.likeCount > 0 && <span>{formatCount(book.likeCount)} likes</span>}
              {book.pageCount && <span>{book.pageCount} pages</span>}
              {book.publishYear && <span>Published {book.publishYear}</span>}
              <span className="text-[var(--text-secondary)]">{book.language.toUpperCase()}</span>
            </div>

            {/* Interactions */}
            <div className="mt-4">
              <BookInteractionButtons
                bookId={book.id}
                likeCount={book.likeCount ?? 0}
                bookTitle={book.title}
                bookAuthor={book.author}
                bookSlug={book.slug}
              />
            </div>

            {/* Description */}
            <div className="mt-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
              <p className="text-[var(--text-secondary)] leading-relaxed">{book.description}</p>
            </div>

            <div className="mt-6 flex justify-center">
              <AdUnit size="inline" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOOK} />
            </div>

            {/* Read / Download */}
            <BookReadActions book={book} formats={book.formats} />

            {/* Price tag + share + savings */}
            <BookDetailClient bookTitle={book.title} bookAuthor={book.author} />
            {tier === 'download' && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                <span className="text-sm text-emerald-700 dark:text-emerald-300">100% legal, open-access</span>
              </div>
            )}
            {tier === 'borrow' && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800">
                <span className="text-sm font-bold text-sky-700 dark:text-sky-300">📚 Available to borrow</span>
                <span className="text-sm text-sky-700 dark:text-sky-300">free at Internet Archive&apos;s lending library</span>
              </div>
            )}
            {tier === 'unverified' && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">🔍 No verified free copy found</span>
                <span className="text-sm text-amber-700 dark:text-amber-300">search the links below on legitimate catalogs</span>
              </div>
            )}

            {/* Real free alternative — shown whenever we can't offer a verified direct download */}
            {tier !== 'download' && (() => {
              const blogSlug = getBlogAlternativeSlug(book.title);
              const categoryPick = getFreeAlternative(book.category.slug);
              if (!blogSlug && !categoryPick) return null;
              return (
                <div className="mt-4 p-4 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-light)]">
                  <p className="text-sm font-bold text-[var(--text)] mb-2">📖 Read something free instead</p>
                  {blogSlug ? (
                    <>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">We wrote a guide to real, completely free alternatives that cover the same material.</p>
                      <a href={`/blog/${blogSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline">
                        See free alternatives to {book.title} →
                      </a>
                    </>
                  ) : categoryPick ? (
                    <>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        <span className="font-semibold text-[var(--text)]">{categoryPick.title}</span> ({categoryPick.publisher}) — {categoryPick.note}
                      </p>
                      <a href={categoryPick.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline">
                        Read it free →
                      </a>
                    </>
                  ) : null}
                </div>
              );
            })()}

            {/* Metadata */}
            <dl className="mt-8 grid grid-cols-2 gap-4">
              <MetaItem label="Category" value={book.category.name} />
              <MetaItem label="Language" value={book.language === 'en' ? 'English' : book.language} />
              {book.isbn && <MetaItem label="ISBN" value={book.isbn} />}
              {book.publisher && <MetaItem label="Publisher" value={book.publisher} />}
              {book.narrator && <MetaItem label="Narrator" value={book.narrator} />}
              {book.duration && <MetaItem label="Duration" value={`${Math.floor(book.duration / 3600)}h ${Math.floor((book.duration % 3600) / 60)}m`} />}
            </dl>
          </div>
        </div>

        {/* Related books */}
        {relatedBooks.length > 0 && (
          <section className="mt-16">
            <SectionHeader title={`More ${book.category.name} books`} icon="📖" action={{ label: 'See all', href: `/category/${book.category.slug}` }} />
            <BookGrid books={relatedBooks} layout="carousel" />
          </section>
        )}
      </div>
    </>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)] mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-[var(--text-secondary)]">{value}</dd>
    </div>
  );
}
