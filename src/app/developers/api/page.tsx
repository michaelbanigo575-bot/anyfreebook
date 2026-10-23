import type { Metadata } from 'next';
import Link from 'next/link';
import { cardClass } from '@/lib/ui';

export const metadata: Metadata = {
  title: 'API Reference — ANYFREEBOOK',
  description:
    'The full reference for the ANYFREEBOOK public API v1: endpoints, parameters, response shapes, the legal tier system, error codes and authentication.',
  openGraph: {
    title: 'ANYFREEBOOK API v1 — Reference',
    description: 'Endpoints, parameters, response shapes and the legal tier system.',
  },
};

const PARAMS = [
  ['q', 'string', 'yes', 'The search query. Max 200 characters.'],
  ['page', 'integer', 'no', 'Defaults to 1.'],
  ['source', 'string', 'no', 'all (default), local, gutenberg, openlibrary, archive, googlebooks, pubmed, doaj, librivox.'],
  ['limit', 'integer', 'no', '1–50, defaults to 20.'],
];

const ERRORS = [
  ['400', 'Missing or invalid parameter.'],
  ['401', 'The presented API key could not be verified.'],
  ['429', 'Rate limit exceeded. The Retry-After header says how long to wait.'],
  ['500', 'Something broke on our side.'],
];

const LIMITS = [
  ['anonymous (no key)', '30', '200'],
  ['free', '60', '2,000'],
  ['partner', '300', '50,000'],
];

function Table({ head, rows }: { head: string[]; rows: (string | JSX.Element)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {head.map(h => (
              <th
                key={h}
                className="text-left font-semibold text-[var(--text)] border-b border-[var(--border-subtle)] pb-2 pr-4 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4 align-top text-[var(--text-secondary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiReferencePage() {
  return (
    <div className="content-wrapper py-10">
      <div className="max-w-3xl mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-3">
          API reference
        </p>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-3">
          ANYFREEBOOK API v1
        </h1>
        <p className="text-[var(--text-secondary)] mb-4">
          Base URL <code className="font-mono text-[var(--text)]">https://anyfreebook.com/api/v1</code>.
          Every response is JSON. Errors carry a stable <code className="font-mono">error</code> field.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          <Link href="/developers" className="text-[var(--primary)] hover:underline">
            &larr; Back to the overview
          </Link>
        </p>
      </div>

      {/* GET /search */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2">
          <code className="font-mono">GET /search</code>
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Searches every open source at once and returns a legal tier for each result.
        </p>
        <div className={cardClass({ hover: false, padding: 'p-4' })}>
          <Table head={['Parameter', 'Type', 'Required', 'Notes']} rows={PARAMS} />
        </div>
        <pre className="mt-3 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-secondary)]">
{`{
  "query": "python",
  "page": 1,
  "limit": 20,
  "total": 22537,
  "count": 20,
  "sources": { "Project Gutenberg": 120, "Open Library": 22417 },
  "failedSources": [],
  "partial": false,
  "results": [
    {
      "id": "pg-39560",
      "title": "Fairy Circles",
      "author": "Villamaria",
      "year": null,
      "source": "Project Gutenberg",
      "sourceType": "gutenberg",
      "sourceUrl": "https://www.gutenberg.org/ebooks/39560",
      "tier": "download",
      "tierReason": "Verified public-domain full text on Project Gutenberg.",
      "license": "Public domain (Project Gutenberg)",
      "files": [
        { "format": "epub", "url": "https://www.gutenberg.org/ebooks/39560.epub3.images", "bytes": null, "label": "EPUB" }
      ],
      "links": [
        { "label": "Read on Project Gutenberg", "url": "https://www.gutenberg.org/ebooks/39560", "source": "Project Gutenberg" }
      ],
      "url": "https://anyfreebook.com/book/fairy-circles-pg-39560"
    }
  ],
  "meta": { "apiVersion": "v1", "generatedAt": "2026-10-23T23:30:00.000Z" }
}`}
        </pre>
        <p className="text-sm text-[var(--text-secondary)] mt-3">
          <strong className="text-[var(--text)]">failedSources</strong> lists the sources that did not
          answer, and <code className="font-mono">partial</code> is{' '}
          <code className="font-mono">true</code> when it is non-empty. A partial result set is not
          an empty result set — surface it rather than presenting a short list as everything.
        </p>
      </section>

      {/* GET /resolve */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2">
          <code className="font-mono">GET /resolve</code>
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The authoritative answer for one title. It asks Project Gutenberg for a real ebook and
          checks the author actually matches, so a book by one Austen never resolves to a different
          book that shares the surname.
        </p>
        <div className={cardClass({ hover: false, padding: 'p-4' })}>
          <Table
            head={['Parameter', 'Type', 'Required', 'Notes']}
            rows={[
              ['title', 'string', 'yes', 'The title to resolve. Max 300 characters.'],
              ['author', 'string', 'no', 'Used to confirm the match.'],
            ]}
          />
        </div>
        <pre className="mt-3 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-secondary)]">
{`{
  "title": "Pride and Prejudice",
  "author": "Jane Austen",
  "tier": "download",
  "tierReason": "Verified public-domain full text on Project Gutenberg.",
  "sourceType": "gutenberg",
  "sourceUrl": "https://www.gutenberg.org/ebooks/1342",
  "license": "Public domain",
  "files": [
    { "format": "epub", "url": "https://www.gutenberg.org/ebooks/1342.epub3.images", "bytes": null, "label": "EPUB" }
  ],
  "links": [
    { "label": "Read on Project Gutenberg", "url": "https://www.gutenberg.org/ebooks/1342", "source": "Project Gutenberg" }
  ],
  "meta": { "apiVersion": "v1", "generatedAt": "2026-10-23T23:30:00.000Z" }
}`}
        </pre>
      </section>

      {/* GET /health */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2">
          <code className="font-mono">GET /health</code>
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Liveness and version. It touches no upstream, so it stays up even when a source is down.
        </p>
        <pre className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-secondary)]">
{`{ "status": "ok", "apiVersion": "v1", "uptimeSeconds": 1234 }`}
        </pre>
      </section>

      {/* Auth */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2">Authentication</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          Optional. The anonymous tier works with no setup. A key is sent as a bearer token:{' '}
          <code className="font-mono">Authorization: Bearer afb_...</code>. A key that cannot be
          verified gets <code className="font-mono">401</code> — it is never silently downgraded to
          the anonymous tier.
        </p>
        <div className={cardClass({ hover: false, padding: 'p-4' })}>
          <Table head={['Tier', 'Requests / minute', 'Requests / day']} rows={LIMITS} />
        </div>
      </section>

      {/* Errors */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">Errors</h2>
        <div className={cardClass({ hover: false, padding: 'p-4' })}>
          <Table head={['Status', 'Meaning']} rows={ERRORS} />
        </div>
      </section>

      {/* CORS */}
      <section className="mb-10">
        <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2">CORS</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Closed by default. The allowlist comes from{' '}
          <code className="font-mono text-[var(--text)]">NEXT_PUBLIC_API_ALLOWED_ORIGINS</code>, a
          comma-separated list of origins. A command-line client or a server-side SDK does not need
          CORS at all.
        </p>
      </section>
    </div>
  );
}
