import { SearchBar } from '@/components/SearchBar';
import { BookGrid } from '@/components/BookGrid';
import { HomeCategoryFinder } from '@/components/HomeCategoryFinder';
import { CollectionGrid } from '@/components/CollectionGrid';
import { SectionHeader } from '@/components/SectionHeader';
import { StatBlock } from '@/components/StatBlock';
import { getTrendingBooks, getNewBooks, getAudiobooks, getAllCategories, getCollections } from '@/lib/data';
import { websiteSchema } from '@/lib/schema';
import { getGutenbergPopular } from '@/lib/api/gutenberg';
import { getOpenLibrarySubject } from '@/lib/api/openlibrary';
import { searchGoogleBooks } from '@/lib/api/googlebooks';
import { searchArchive } from '@/lib/api/archive';
import { LiveTrendingSection } from '@/components/LiveTrendingSection';
import { cardClass } from '@/lib/ui';

// Serve the homepage from cache instead of hitting 5 external book APIs on
// every visitor — critical under a traffic spike (a launch post, etc.), where
// uncached external calls would slow the page or get the site rate-limited by
// those APIs.
export const revalidate = 300;

/**
 * Hard ceiling on how long the homepage may wait for third-party APIs.
 *
 * The adapters themselves abort at 10s, so a slow upstream could hold the
 * homepage open for ~11s. Google's crawler gives up around 10s and records
 * the site as "down or unavailable" — which is what happened to our AdSense
 * review. 3s keeps us comfortably inside that budget: anything slower is
 * dropped and we fall back to the local catalog, which always responds.
 */
const HOMEPAGE_API_BUDGET_MS = 3000;

async function fetchLiveBooks() {
  try {
    // Each call is individually capped at 3s. allSettled means a timeout
    // costs us that one shelf, never the page.
    const withBudget = <T,>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('homepage api budget exceeded')), HOMEPAGE_API_BUDGET_MS)
        ),
      ]);

    const [gutenberg, openlib, google, archive, fiction] = await Promise.allSettled([
      withBudget(getGutenbergPopular(1)),
      withBudget(getOpenLibrarySubject('popular', 20, 0)),
      withBudget(searchGoogleBooks('bestseller', 0, 20)),
      withBudget(searchArchive('popular books', 1, 20)),
      withBudget(getOpenLibrarySubject('fiction', 20, 0)),
    ]);

    const books = [
      ...(gutenberg.status === 'fulfilled' && gutenberg.value ? gutenberg.value.books.slice(0, 15) : []),
      ...(openlib.status === 'fulfilled' && openlib.value ? openlib.value.books.slice(0, 15) : []),
      ...(google.status === 'fulfilled' && google.value ? google.value.books.slice(0, 15) : []),
      ...(archive.status === 'fulfilled' && archive.value ? archive.value.books.slice(0, 15) : []),
      ...(fiction.status === 'fulfilled' && fiction.value ? fiction.value.books.slice(0, 15) : []),
    ];

    return books;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const trending = getTrendingBooks();
  const newBooks = getNewBooks();
  const audiobooks = getAudiobooks();
  const categories = getAllCategories();
  const collections = getCollections();

  let liveBooks: any[] = [];
  try {
    liveBooks = await fetchLiveBooks();
  } catch {}

  // Big rotating pool: the grid shows 25 at a time and cycles through all of these every 3s
  const allTrending = [...liveBooks, ...trending].slice(0, 80);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[var(--primary)]/5 to-transparent rounded-full" />
        </div>

        <div className="content-wrapper text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/20 mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[var(--primary)] font-mono text-xs tracking-widest font-semibold">
              240+ CURATED BOOKS FROM 7 OPEN SOURCES
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-[var(--text)] leading-[1.1] max-w-3xl mx-auto text-balance animate-slide-up">
            Every profession.{' '}
            <span className="gradient-text">Every free book.</span>
            {' '}One place.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The free book aggregator — pulling live from
            Open Library, Project Gutenberg, Google Books, Internet Archive, PubMed Central, and DOAJ.
          </p>

          {/* Main search + Category dropdown side by side */}
          <div className="mt-10 max-w-2xl mx-auto flex items-stretch gap-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex-1 min-w-0">
              <SearchBar />
            </div>
            <HomeCategoryFinder categories={categories} />
          </div>
        </div>
      </section>

      {/* NEW ON ANYFREEBOOK — feature showcase */}
      <section className="content-wrapper py-10">
        <SectionHeader title="New on ANYFREEBOOK" icon="🚀" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: '🎓', title: 'Live Classrooms', desc: 'Join free live classes from authors — video, screen share & chat', href: '/classrooms', badge: 'NEW' },
            { icon: '🤖', title: 'AI Study Aids', desc: 'Instant AI summaries & quizzes on every publication', href: '/creators/discover', badge: 'NEW' },
            { icon: '💸', title: 'Publish & Earn', desc: 'Publish your books & notes free — earn from every verified read', href: '/creators', badge: null },
            { icon: '📰', title: 'The Feed', desc: 'New books, live classes & updates from authors you read', href: '/feed', badge: 'NEW' },
            { icon: '📖', title: 'Serialized Books', desc: 'Follow stories chapter by chapter as authors release them', href: '/creators/discover', badge: 'NEW' },
            { icon: '🎧', title: 'Free Audiobooks', desc: 'Thousands of audiobooks from LibriVox & Internet Archive', href: '/audiobooks', badge: null },
            { icon: '📝', title: 'WAEC & JAMB Prep', desc: 'Curated official exam-prep resources for Nigerian students', href: '/waec-jamb', badge: 'NEW' },
            { icon: '🌙', title: 'Reader Comfort', desc: 'Fonts, sepia & dark themes, text size — reading your way', href: '/creators/discover', badge: 'NEW' },
          ].map(f => (
            <a key={f.title} href={f.href} className={`relative ${cardClass({ padding: 'p-4' })}`}>
              {f.badge && (
                <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-[8px] font-bold">{f.badge}</span>
              )}
              <span className="text-2xl">{f.icon}</span>
              <h3 className="text-sm font-bold text-[var(--text)] mt-2">{f.title}</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{f.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* TRENDING — Live from APIs */}
      <section className="content-wrapper py-10">
        <SectionHeader title="Trending now — Live" icon="🔥" action={{ label: 'Search more', href: '/search' }} />
        <LiveTrendingSection books={allTrending} />
      </section>

      {/* RECENTLY ADDED */}
      <section className="content-wrapper py-10">
        <SectionHeader title="Just added" icon="✨" action={{ label: 'See all', href: '/new' }} />
        <BookGrid books={newBooks} layout="carousel" />
      </section>

      {/* AUDIOBOOKS */}
      <section className="content-wrapper py-10">
        <SectionHeader title="Free audiobooks" icon="🎧" action={{ label: 'Browse all', href: '/audiobooks' }} />
        <BookGrid books={audiobooks} layout="shelf" />
      </section>

      {/* CURATED COLLECTIONS */}
      <section className="content-wrapper py-10">
        <SectionHeader title="Curated collections" icon="📚" />
        <CollectionGrid collections={collections} />
      </section>

      {/* STATS BAR */}
      <section className="bg-[var(--bg-secondary)] py-16 mt-12 border-y border-[var(--border-subtle)]">
        <div className="content-wrapper">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatBlock number="240+" label="Free Books" />
            <StatBlock number="70K+" label="Gutenberg Titles" />
            <StatBlock number="6" label="Live Sources" />
            <StatBlock number="∞" label="Formats" />
          </div>
        </div>
      </section>

      {/* FAQ for SEO */}
      <section className="content-wrapper py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'Is ANYFREEBOOK really free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, 100%. Every book on ANYFREEBOOK is sourced from legal, open-access repositories like Project Gutenberg, Open Library, and Google Books. No sign-up, no credit card required.' }},
              { '@type': 'Question', name: 'How many free books does ANYFREEBOOK have?', acceptedAnswer: { '@type': 'Answer', text: 'ANYFREEBOOK curates 240+ free books and searches 7 open-access repositories live — Open Library, Project Gutenberg, Google Books, the Internet Archive, LibriVox, PubMed Central and DOAJ — so a single search reaches millions of titles.' }},
              { '@type': 'Question', name: 'What formats are available?', acceptedAnswer: { '@type': 'Answer', text: 'Books are available in PDF, EPUB, MOBI, HTML, and plain text formats. Audiobooks come in MP3 format. The available formats depend on the source repository.' }},
              { '@type': 'Question', name: 'Where do the books come from?', acceptedAnswer: { '@type': 'Answer', text: 'ANYFREEBOOK pulls live data from Open Library (Internet Archive), Project Gutenberg, and Google Books free ebooks. All sources are legal, public domain, or Creative Commons.' }},
              { '@type': 'Question', name: 'Can I download the books?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! Each book links directly to its source where you can read online or download in multiple formats. We link you to the official source for the best experience.' }},
            ],
          }) }}
        />
        <h2 className="text-2xl font-display font-bold text-[var(--text)] mb-6">Frequently asked questions</h2>
        <div className="max-w-3xl space-y-3">
          {[
            { q: 'Is ANYFREEBOOK really free?', a: 'Yes, 100%. Every book is sourced from legal, open-access repositories like Project Gutenberg, Open Library, and Google Books. No sign-up or credit card required.' },
            { q: 'How many free books are available?', a: 'We curate 240+ free books and search 7 open-access repositories live — Open Library, Project Gutenberg, Google Books, the Internet Archive, LibriVox, PubMed Central and DOAJ — so one search reaches millions of titles.' },
            { q: 'What formats are available?', a: 'Books come in PDF, EPUB, HTML, and plain text. Available formats depend on the source. Each book links to its original source for download.' },
            { q: 'Where do the books come from?', a: 'ANYFREEBOOK pulls live data from Open Library (Internet Archive), Project Gutenberg, and Google Books. All are legal, open-access sources.' },
            { q: 'Can I download the books?', a: 'Yes! Each book links directly to its source for reading online or downloading. We aggregate and link — the books live on their original platforms.' },
          ].map(faq => (
            <details key={faq.q} className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors">
                {faq.q}
                <svg className="w-4 h-4 text-[var(--text-muted)] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </summary>
              <div className="px-4 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="content-wrapper py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] mb-4">
          Start reading for free today
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
          No sign-up required. No credit card. Search millions of titles from the world&apos;s best open-access sources — every result links to its original source.
        </p>
        <a
          href="/search"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          Search the library
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </section>
    </>
  );
}
