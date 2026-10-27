import type { Metadata } from 'next';
import Link from 'next/link';
import { cardClass, primaryButtonClass } from '@/lib/ui';
import { SOURCE_REGISTRY } from '@/lib/api/sources';

export const metadata: Metadata = {
  title: 'Free Books API for Developers — ANYFREEBOOK',
  description:
    'A free, no-signup HTTP API over seven open-access book sources. Every result carries a legal tier, so you know whether a title is actually free to download before you link to it.',
  openGraph: {
    title: 'Free Books API for Developers — ANYFREEBOOK',
    description: 'One API over Project Gutenberg, Open Library, the Internet Archive, PubMed, DOAJ, LibriVox and Google Books — with a legal tier on every result.',
  },
};

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/search?q=python&limit=20',
    what: 'Search every open source at once. Returns a tier and the real file URLs for each result.',
  },
  {
    method: 'GET',
    path: '/api/v1/resolve?title=Pride%20and%20Prejudice&author=Jane%20Austen',
    what: 'The authoritative answer for one title, with the author checked against the real record.',
  },
  {
    method: 'GET',
    path: '/api/v1/health',
    what: 'Liveness and version. Touches no upstream, so it stays up when a source is down.',
  },
];

const TIERS = [
  {
    tier: 'download',
    meaning: 'A free, legally readable copy of this exact title.',
    detail: 'files[] holds the direct URLs when the source exposes one.',
    tone: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    tier: 'borrow',
    meaning: 'A real copy, but borrow-only: a free Internet Archive account and a loan are required.',
    detail: 'Not a download. files[] is empty.',
    tone: 'text-amber-600 dark:text-amber-400',
  },
  {
    tier: 'unverified',
    meaning: 'A catalogue record or a search page. No confirmed free copy of this exact title.',
    detail: 'files[] is empty. links[] points at the real source.',
    tone: 'text-[var(--text-muted)]',
  },
];

const SOURCES = SOURCE_REGISTRY.map(s => s.label);

export default function DevelopersPage() {
  return (
    <div className="content-wrapper py-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-3">
          For developers
        </p>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-4">
          One free API for every open book source
        </h1>
        <p className="text-lg text-[var(--text-secondary)] mb-6">
          Search Project Gutenberg, Open Library, the Internet Archive, Google Books, PubMed
          Central, DOAJ and LibriVox through a single endpoint. No key required to start.
        </p>
        <p className="text-[var(--text-secondary)] mb-8">
          The part most &ldquo;free book&rdquo; APIs skip: every result carries a{' '}
          <strong className="text-[var(--text)]">legal tier</strong>, so you know whether the thing
          behind that link is genuinely free to download, is a borrow-only loan, or is just a
          catalogue record — before you ship a link to it.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href="https://github.com/michaelbanigo575-bot/anyfreebook-cli"
            className={primaryButtonClass()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get the CLI
          </a>
          <a
            href="/api/v1/health"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[var(--radius-lg)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check the API
          </a>
        </div>
      </div>

      {/* Quick start */}
      <section className="mb-12">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">Quick start</h2>
        <pre className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
{`curl "https://anyfreebook.com/api/v1/search?q=pride+and+prejudice&limit=3"

# every result carries a tier
# "tier": "download"  -> files[] has the real EPUB / TXT / HTML URLs
# "tier": "borrow"    -> a loan, not a download
# "tier": "unverified"-> a catalogue record; links[] points at the source`}
        </pre>
      </section>

      {/* Endpoints */}
      <section className="mb-12">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-4">Endpoints</h2>
        <div className="space-y-3">
          {ENDPOINTS.map(e => (
            <div key={e.path} className={cardClass({ hover: false, padding: 'p-4' })}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                  {e.method}
                </span>
                <code className="text-sm font-mono text-[var(--text)] break-all">{e.path}</code>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{e.what}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="mb-12">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2">The tier system</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The tier comes from the source&rsquo;s own metadata — for the Internet Archive we read
          <code className="font-mono text-[var(--text)]"> access-restricted-item</code> and
          <code className="font-mono text-[var(--text)]"> lending_identifier</code> from the
          item&rsquo;s own record. It is never a guess.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {TIERS.map(t => (
            <div key={t.tier} className={cardClass({ hover: false })}>
              <code className={`font-mono text-sm font-bold ${t.tone}`}>{t.tier}</code>
              <p className="text-sm text-[var(--text-secondary)] mt-2 mb-1">{t.meaning}</p>
              <p className="text-xs text-[var(--text-muted)]">{t.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section className="mb-12">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">Sources</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {SOURCE_REGISTRY.length} open-access sources, asked in parallel. When one does not answer, the response
          says so in <code className="font-mono text-[var(--text)]">failedSources</code> — a short
          result set is never presented as a complete one.
        </p>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map(s => (
            <span
              key={s}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Clients */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-4">Clients</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cardClass({ hover: false })}>
            <h3 className="font-display font-bold text-[var(--text)] mb-1">anyfreebook-cli</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Batch-download public-domain books from your terminal.
            </p>
            <pre className="text-xs bg-[var(--bg-secondary)] rounded-lg p-3 overflow-x-auto text-[var(--text-secondary)]">
{`npm install -g anyfreebook-cli
anyfreebook download "python" --format epub`}
            </pre>
          </div>
          <div className={cardClass({ hover: false })}>
            <h3 className="font-display font-bold text-[var(--text)] mb-1">anyfreebook-api</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              The same API from Python, with no dependencies.
            </p>
            <pre className="text-xs bg-[var(--bg-secondary)] rounded-lg p-3 overflow-x-auto text-[var(--text-secondary)]">
{`pip install anyfreebook-api
from anyfreebook_api import Client`}
            </pre>
          </div>
        </div>
      </section>

      <p className="text-sm text-[var(--text-muted)]">
        Full reference:{' '}
        <Link href="/developers/api" className="text-[var(--primary)] hover:underline">
          the API documentation
        </Link>
        .
      </p>
    </div>
  );
}
