import type { Metadata } from 'next';
import Link from 'next/link';
import { LOCAL_CATALOGUE, SOURCE_REGISTRY, type SourceDescriptor } from '@/lib/api/sources';
import { breadcrumbSchema } from '@/lib/schema';
import { cardClass } from '@/lib/ui';

export const metadata: Metadata = {
  title: 'Our Sources — 12 Live Open-Access Libraries, Explained',
  description:
    'Every source ANYFREEBOOK searches, what each one holds, what licence it uses and whether a result from it is a real download. Project Gutenberg, Internet Archive, Open Library, Google Books, LibriVox, PubMed Central, DOAJ, OpenAlex, Zenodo, Wikisource, Europeana and the Open Textbook Library.',
  openGraph: {
    title: 'Our Sources — ANYFREEBOOK',
    description: 'What each open-access source holds, and what a result from it actually means.',
  },
  alternates: { canonical: '/sources' },
};

const KIND_LABEL: Record<string, string> = {
  books: 'Books',
  papers: 'Papers',
  textbooks: 'Textbooks',
  classics: 'Classics',
  audiobooks: 'Audiobooks',
};

function SourceCard({ source }: { source: SourceDescriptor }) {
  return (
    <article className={cardClass({ hover: false })}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <h2 className="text-lg font-display font-bold text-[var(--text)]">{source.label}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          {KIND_LABEL[source.kind] ?? source.kind}
        </span>
        {source.catalogueSize && (
          <span className="text-xs text-[var(--text-muted)]">{source.catalogueSize}</span>
        )}
      </div>

      <p className="text-[var(--text-secondary)] leading-relaxed mb-4">{source.description}</p>

      <dl className="text-sm space-y-1.5">
        <div className="flex gap-2">
          <dt className="text-[var(--text-muted)] shrink-0 w-20">Licence</dt>
          <dd className="text-[var(--text-secondary)]">{source.licence}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--text-muted)] shrink-0 w-20">Files</dt>
          <dd className="text-[var(--text-secondary)]">
            {source.providesFiles ? 'A real file is attached to each result.' : 'No file — links to the source.'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--text-muted)] shrink-0 w-20">Home</dt>
          <dd>
            <a
              href={source.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline break-all"
            >
              {source.homepage}
            </a>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function SourcesPage() {
  const schema = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Sources', path: '/sources' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="content-wrapper py-8">
        <div className="max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-4">
            Where the books come from
          </h1>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            ANYFREEBOOK searches {SOURCE_REGISTRY.length} open-access libraries at once and asks
            them in parallel. Nothing here is scraped from a shadow library: each source publishes
            its own catalogue, and each result carries the tier its source actually supports. When a
            title is a real download, the page says so and links the file. When it is not, the page
            says that too, and offers a genuinely free alternative instead.
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-4">
            The same list is available as JSON at{' '}
            <Link href="/api/v1/sources" className="text-[var(--primary)] hover:underline">
              /api/v1/sources
            </Link>
            , so it cannot drift from the code.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {SOURCE_REGISTRY.map(source => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>

        <section className="max-w-3xl mx-auto mt-12">
          <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">
            And our own catalogue
          </h2>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            {LOCAL_CATALOGUE.description} {LOCAL_CATALOGUE.catalogueSize}. It powers the category
            pages and the book detail pages.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Every title carries a legal tier:{' '}
            <strong className="text-[var(--text)]">download</strong> means a verified public-domain
            full text with the author matched; <strong className="text-[var(--text)]">borrow</strong>{' '}
            means a real copy that the lending library restricts;{' '}
            <strong className="text-[var(--text)]">unverified</strong> means the record exists but
            the licence is not confirmed, so we link the source and say so rather than claim a free
            download. See{' '}
            <Link href="/free-textbook-alternatives" className="text-[var(--primary)] hover:underline">
              free textbook alternatives
            </Link>{' '}
            for what to read instead.
          </p>
        </section>
      </div>
    </>
  );
}
