import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookGrid } from '@/components/BookGrid';
import { AdUnit } from '@/components/AdUnit';
import { getCategory, type Book } from '@/lib/data';
import { faqSchema, breadcrumbSchema } from '@/lib/schema';
import { searchOpenLibrary } from '@/lib/api/openlibrary';
import { searchArchive } from '@/lib/api/archive';
import { searchGoogleBooks } from '@/lib/api/googlebooks';

// Categories render on demand, cache each for an hour. Pre-rendering all of
// them at build time would hammer the source APIs and slow every deploy.
export const revalidate = 3600;
export const dynamicParams = true;

type LiveCategory = {
  books: Book[];
  /** Titles matching the category query on Open Library (its own numFound). */
  olTotal: number;
  /** Titles matching across Open Library + Internet Archive + Google Books. */
  total: number;
};

/**
 * Live results for a category. The counts come from the sources themselves
 * (numFound / totalItems), never from a hardcoded number.
 */
async function fetchLiveCategoryBooks(query: string): Promise<LiveCategory> {
  try {
    const [ol, archive, gb] = await Promise.allSettled([
      searchOpenLibrary(query, 30, 1),
      searchArchive(query, 1, 24),
      searchGoogleBooks(query, 0, 20),
    ]);
    const olTotal = ol.status === 'fulfilled' ? ol.value.total : 0;
    const archiveTotal = archive.status === 'fulfilled' ? archive.value.total : 0;
    const gbTotal = gb.status === 'fulfilled' ? gb.value.total : 0;
    return {
      books: [
        ...(ol.status === 'fulfilled' ? ol.value.books : []),
        ...(archive.status === 'fulfilled' ? archive.value.books : []),
        ...(gb.status === 'fulfilled' ? gb.value.books : []),
      ],
      olTotal,
      total: olTotal + archiveTotal + gbTotal,
    };
  } catch {
    return { books: [], olTotal: 0, total: 0 };
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = getCategory(params.slug);
  if (!category) return {};

  // Same fetch URLs as the page body, so Next's data cache serves the second
  // call — the upstream APIs are still hit exactly once per category per hour.
  const { olTotal } = await fetchLiveCategoryBooks(category.query || category.name);
  const n = olTotal.toLocaleString();
  const name = category.name.toLowerCase();

  return {
    title:
      olTotal > 0
        ? `Free ${category.name} Books — ${n}+ Titles`
        : `Free ${category.name} Books — Download Free PDF, EPUB & HTML`,
    description:
      olTotal > 0
        ? `Search ${n}+ titles in ${name}. Open Library, Internet Archive and Google Books results stream live — curated picks verified free and legal.`
        : `Browse free ${name} books streamed live from Open Library, Internet Archive and Google Books. Curated picks verified free and legal.`,
    openGraph: {
      title: olTotal > 0 ? `Free ${category.name} Books — ${n}+ Titles` : `Free ${category.name} Books`,
      description: `Free ${name} books from Open Library, Internet Archive and Google Books.`,
      images: [
        {
          url: `/api/og?title=Free+${encodeURIComponent(category.name)}+Books&subtitle=${encodeURIComponent(
            olTotal > 0 ? `${n}+ Titles Live from Open Sources` : 'Free Books for Every Profession'
          )}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategory(params.slug);
  if (!category) notFound();

  // Live books only — every card links to a real, downloadable/readable book
  // at its source. No synthetic filler.
  const query = category.query || category.name;
  const { books: live, olTotal } = await fetchLiveCategoryBooks(query);
  const seen = new Set<string>();
  const books = live.filter(b => {
    const key = b.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const schemas = [
    faqSchema(category.name, olTotal),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: category.name, path: `/category/${category.slug}` },
    ]),
  ];

  const n = olTotal.toLocaleString();
  const name = category.name.toLowerCase();

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
          <span className="text-[var(--text-secondary)]">{category.name}</span>
        </nav>

        {/* Header */}
        <div className={`rounded-2xl p-8 md:p-12 bg-gradient-to-br ${category.gradient} border border-[var(--border-subtle)] mb-10`}>
          <span className="text-5xl mb-4 block">{category.icon}</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
            Free {category.name} Books
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl">
            {category.description}.{' '}
            {olTotal > 0 ? (
              <>
                {n}+ titles matched &ldquo;{query}&rdquo; on Open Library, with more results streamed
                from the Internet Archive and Google Books.
              </>
            ) : (
              <>Results stream live from Open Library, the Internet Archive and Google Books.</>
            )}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm font-medium text-[var(--primary)]">
              {olTotal > 0 ? `${n}+ titles found` : 'Live results'}
            </span>
            <span className="text-sm text-[var(--text-muted)]">PDF, EPUB & more</span>
          </div>
        </div>

        {/* Books grid */}
        <BookGrid books={books} layout="grid" />

        {books.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-lg font-medium text-[var(--text-secondary)]">Books coming soon</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">We&apos;re adding {name} books daily.</p>
          </div>
        )}

        {books.length > 0 && (
          <div className="mt-10">
            <AdUnit size="inline" slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY} />
          </div>
        )}

        {/* FAQ section */}
        <section className="mt-16 max-w-3xl">
          <h2 className="text-xl font-display font-bold text-[var(--text)] mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: `Where can I find free ${name} books?`,
                a: `ANYFREEBOOK searches Open Library, the Internet Archive and Google Books live for ${name}. ${
                  olTotal > 0 ? `${n}+ titles matched on Open Library, ` : ''
                }and every curated pick links straight to its source with a badge showing whether it is verified free to download.`,
              },
              {
                q: `Are these ${name} books really free and legal?`,
                a: 'Yes. Every book on ANYFREEBOOK comes from verified legal sources — public domain works, Creative Commons publications, government repositories, and open-access academic libraries.',
              },
              {
                q: `Can I download free ${name} books as PDF?`,
                a: `Most ${name} books on ANYFREEBOOK are available in multiple formats including PDF, EPUB, and plain text. Some also have free audiobook versions.`,
              },
            ].map(faq => (
              <details
                key={faq.q}
                className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors">
                  {faq.q}
                  <svg className="w-4 h-4 text-[var(--text-muted)] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
