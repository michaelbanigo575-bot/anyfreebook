import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free Textbook Alternatives — Save $1,200+/Year | ANYFREEBOOK',
  description: 'Find free alternatives to expensive textbooks. Search 5M+ free books from Open Library, Project Gutenberg & Google Books. No sign-up required.',
  keywords: ['free textbook alternatives', 'free college textbooks', 'open textbook', 'free PDF textbooks', 'textbook savings', 'OER textbooks'],
  openGraph: {
    title: 'Free Textbook Alternatives — Save $1,200+/Year',
    description: 'Stop paying hundreds for textbooks. Find free legal alternatives instantly.',
  },
};

const POPULAR_TEXTBOOKS = [
  { paid: 'Campbell Biology ($289)', free: 'biology textbook', savings: 289 },
  { paid: 'Calculus by Stewart ($279)', free: 'calculus textbook', savings: 279 },
  { paid: 'Organic Chemistry ($249)', free: 'organic chemistry textbook', savings: 249 },
  { paid: 'Physics by Halliday ($259)', free: 'physics textbook', savings: 259 },
  { paid: 'Principles of Economics ($219)', free: 'economics principles textbook', savings: 219 },
  { paid: 'Introduction to Algorithms ($89)', free: 'algorithms textbook', savings: 89 },
  { paid: 'Harrison\'s Internal Medicine ($179)', free: 'internal medicine textbook', savings: 179 },
  { paid: 'Corporate Finance ($249)', free: 'corporate finance textbook', savings: 249 },
  { paid: 'Fundamentals of Nursing ($149)', free: 'nursing textbook', savings: 149 },
  { paid: 'Data Structures ($119)', free: 'data structures textbook', savings: 119 },
  { paid: 'Linear Algebra ($159)', free: 'linear algebra textbook', savings: 159 },
  { paid: 'Anatomy & Physiology ($199)', free: 'anatomy physiology textbook', savings: 199 },
];

const SOURCES = [
  { name: 'Open Library', books: '5M+', desc: 'Internet Archive\'s lending library with millions of scanned books', url: 'https://openlibrary.org' },
  { name: 'Project Gutenberg', books: '70K+', desc: 'Public domain ebooks, mostly classic literature and older textbooks', url: 'https://gutenberg.org' },
  { name: 'Google Books', books: '10K+', desc: 'Free ebooks from Google\'s book scanning project', url: 'https://books.google.com' },
  { name: 'OpenStax', books: '50+', desc: 'Peer-reviewed, openly licensed textbooks by Rice University', url: 'https://openstax.org' },
  { name: 'MIT OpenCourseWare', books: '2,500+', desc: 'Free course materials from MIT, including textbook PDFs', url: 'https://ocw.mit.edu' },
  { name: 'DOAJ', books: '8M+', desc: 'Directory of Open Access Journals with full-text academic papers', url: 'https://doaj.org' },
];

export default function FreeTextbookAlternativesPage() {
  const totalSavings = POPULAR_TEXTBOOKS.reduce((sum, t) => sum + t.savings, 0);

  return (
    <div className="content-wrapper py-12 max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'Where can I find free textbooks online?', acceptedAnswer: { '@type': 'Answer', text: 'ANYFREEBOOK aggregates 5M+ free books from Open Library, Project Gutenberg, and Google Books. Search any textbook title to find free legal alternatives in PDF, EPUB, and HTML formats.' }},
            { '@type': 'Question', name: 'Are free textbook alternatives legal?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All books on ANYFREEBOOK come from legal sources: public domain works, Creative Commons publications, open educational resources (OER), and library lending programs like Internet Archive.' }},
            { '@type': 'Question', name: 'How much can I save on textbooks?', acceptedAnswer: { '@type': 'Answer', text: 'The average college student spends $1,200+ per year on textbooks. By using free alternatives from ANYFREEBOOK, students can save 80-100% of their textbook costs.' }},
          ],
        }) }}
      />

      <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] leading-tight">
        Free Alternatives to Every Expensive Textbook
      </h1>
      <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
        The average college student spends <strong className="text-[var(--text)]">$1,200+ per year</strong> on textbooks.
        ANYFREEBOOK helps you find free legal alternatives from Open Library, Project Gutenberg, and Google Books.
        No sign-up. No catch. Just free books.
      </p>

      {/* Savings calculator */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-1">💰 Potential Savings Calculator</h2>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          If you found free alternatives for these 12 popular textbooks, you&apos;d save <strong className="text-2xl">${totalSavings.toLocaleString()}</strong>
        </p>
      </div>

      {/* Popular textbooks */}
      <div className="mt-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-4">
          Find free alternatives to popular textbooks
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {POPULAR_TEXTBOOKS.map(t => (
            <Link
              key={t.paid}
              href={`/search?q=${encodeURIComponent(t.free)}`}
              className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)] line-clamp-1">{t.paid}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Search free alternatives →</p>
              </div>
              <span className="text-sm font-bold text-emerald-600 whitespace-nowrap ml-2">Save ${t.savings}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sources */}
      <div className="mt-12">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-4">
          Where we find free textbooks
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {SOURCES.map(s => (
            <div key={s.name} className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--text)]">{s.name}</h3>
                <span className="text-xs font-mono text-[var(--primary)] font-bold">{s.books}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-12">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-4">
          How to find free textbooks on ANYFREEBOOK
        </h2>
        <div className="space-y-4">
          {[
            { step: '1', title: 'Search for your textbook', desc: 'Type the title, author, or ISBN of any textbook in our search bar. We query Open Library, Project Gutenberg, and Google Books simultaneously.' },
            { step: '2', title: 'Compare free editions', desc: 'See results from all sources with format badges (PDF, EPUB, HTML). Each result shows which source has it and in what format.' },
            { step: '3', title: 'Read or download for free', desc: 'Click "Read Free" to go directly to the source. Download in your preferred format — no sign-up, no credit card, no catch.' },
          ].map(item => (
            <div key={item.step} className="flex gap-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">{item.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center py-10 px-6 rounded-2xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
        <h2 className="text-2xl font-display font-bold mb-2">Stop overpaying for textbooks</h2>
        <p className="opacity-90 mb-6">Search 5,000,000+ free books right now. No sign-up required.</p>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[var(--primary)] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          Search Free Textbooks
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Link>
      </div>
    </div>
  );
}
