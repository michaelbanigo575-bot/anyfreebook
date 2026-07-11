import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookCover } from '@/components/BookCover';
import { BookGrid } from '@/components/BookGrid';
import { SectionHeader } from '@/components/SectionHeader';
import { getBookBySlug, getBooksByCategory, formatCount, getAllBooks } from '@/lib/data';
import { BookInteractionButtons } from '@/components/BookInteractions';
import { BookReadActions } from '@/components/BookReadActions';
import { bookSchema, breadcrumbSchema } from '@/lib/schema';
import { BookDetailClient } from '@/components/BookDetailClient';
import { resolveBookSource } from '@/lib/api/resolveSource';
import { AdUnit } from '@/components/AdUnit';

export async function generateStaticParams() {
  return getAllBooks().map(book => ({ slug: book.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const book = getBookBySlug(params.slug);
  if (!book) return {};

  return {
    title: `${book.title} by ${book.author} — Free ${book.contentType === 'AUDIOBOOK' ? 'Audiobook' : 'PDF'} Download`,
    description: `Download "${book.title}" by ${book.author} for free in ${book.formats.join(', ')} format. ${book.description}`,
    openGraph: {
      title: `${book.title} — Free Download`,
      description: book.description,
      type: 'book',
      images: [{ url: `/api/og?title=${encodeURIComponent(book.title)}&subtitle=${encodeURIComponent(`by ${book.author} — Free ${book.formats.join(', ')}`)}&type=book`, width: 1200, height: 630 }],
    },
  };
}

export default async function BookPage({ params }: { params: { slug: string } }) {
  const localBook = getBookBySlug(params.slug);
  if (!localBook) notFound();

  let book = localBook;
  if (!book.sourceUrl && (!book.downloadLinks || book.downloadLinks.length === 0)) {
    const resolved = await resolveBookSource(book.title, book.author);
    if (resolved) {
      book = { ...book, sourceUrl: resolved.sourceUrl, sourceType: resolved.sourceType, downloadLinks: resolved.downloadLinks };
    }
  }

  const relatedBooks = getBooksByCategory(book.category.slug)
    .filter(b => b.id !== book.id)
    .slice(0, 6);

  const schemas = [
    bookSchema(book),
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
              <BookCover title={book.title} author={book.author} size="xl" />
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
              <span>{formatCount(book.viewCount)} reads</span>
              <span>{formatCount(book.likeCount)} likes</span>
              {book.pageCount && <span>{book.pageCount} pages</span>}
              {book.publishYear && <span>Published {book.publishYear}</span>}
              <span className="text-[var(--text-secondary)]">{book.language.toUpperCase()}</span>
            </div>

            {/* Interactions */}
            <div className="mt-4">
              <BookInteractionButtons
                bookId={book.id}
                likeCount={book.likeCount}
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
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
              <span className="text-sm text-emerald-700 dark:text-emerald-300">100% legal, open-access</span>
            </div>

            {/* Metadata */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <MetaItem label="Category" value={book.category.name} />
              <MetaItem label="Language" value={book.language === 'en' ? 'English' : book.language} />
              {book.isbn && <MetaItem label="ISBN" value={book.isbn} />}
              {book.publisher && <MetaItem label="Publisher" value={book.publisher} />}
              {book.narrator && <MetaItem label="Narrator" value={book.narrator} />}
              {book.duration && <MetaItem label="Duration" value={`${Math.floor(book.duration / 3600)}h ${Math.floor((book.duration % 3600) / 60)}m`} />}
            </div>
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
