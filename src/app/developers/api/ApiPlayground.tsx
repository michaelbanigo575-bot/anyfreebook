'use client';

import { useState } from 'react';

/**
 * A live API playground.
 *
 * A developer deciding whether to use an API is not going to read the
 * parameter table and imagine a response. They will paste a query and look.
 * This lets them do that without leaving the page, and without an API key —
 * the anonymous tier is 30 requests a minute, which is enough to try it.
 */
export function ApiPlayground() {
  const [query, setQuery] = useState('free textbooks');
  const [source, setSource] = useState('all');
  const [limit, setLimit] = useState(3);
  const [result, setResult] = useState<{ body: string; meta: string; status: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!query.trim()) return;
    setBusy(true);
    const url =
      `/api/v1/search?q=${encodeURIComponent(query.trim())}` +
      `&source=${encodeURIComponent(source)}&limit=${Math.max(1, Math.min(10, limit))}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      const quota = [
        res.headers.get('x-ratelimit-limit') && `limit ${res.headers.get('x-ratelimit-limit')}/min`,
        res.headers.get('x-ratelimit-tier') && `tier ${res.headers.get('x-ratelimit-tier')}`,
        res.headers.get('x-ratelimit-scope') && `quota ${res.headers.get('x-ratelimit-scope')}`,
      ]
        .filter(Boolean)
        .join(' · ');
      setResult({ body, meta: quota, status: res.status });
    } catch (err) {
      setResult({
        body: `Request failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        meta: '',
        status: 0,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label htmlFor="pg-q" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Query
          </label>
          <input
            id="pg-q"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run(); }}
            placeholder="free textbooks"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div>
          <label htmlFor="pg-source" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Source
          </label>
          <select
            id="pg-source"
            value={source}
            onChange={e => setSource(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
          >
            {[
              'all', 'gutenberg', 'openlibrary', 'archive', 'googlebooks', 'pubmed', 'doaj',
              'librivox', 'openalex', 'wikisource', 'europeana', 'zenodo', 'otl',
            ].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pg-limit" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Limit
          </label>
          <input
            id="pg-limit"
            type="number"
            min={1}
            max={10}
            value={limit}
            onChange={e => setLimit(parseInt(e.target.value || '3', 10))}
            className="w-20 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
          />
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="px-5 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {busy ? 'Running…' : 'Run'}
        </button>
      </div>

      {result && (
        <div className="mt-4">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            HTTP {result.status}
            {result.meta ? ` · ${result.meta}` : ''}
          </p>
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  );
}
