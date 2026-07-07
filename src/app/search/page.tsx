'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { BookCover } from '@/components/BookCover';
import { BookPreviewModal } from '@/components/BookPreviewModal';
import type { Book } from '@/lib/data';

function SourceBadge({ source }: { source?: string }) {
  const colors: Record<string, string> = {
    openlibrary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    gutenberg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    googlebooks: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    archive: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    pubmed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    doaj: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    local: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  };
  const labels: Record<string, string> = {
    openlibrary: 'Open Library',
    gutenberg: 'Gutenberg',
    googlebooks: 'Google Books',
    archive: 'Internet Archive',
    pubmed: 'PubMed Central',
    doaj: 'DOAJ',
    local: 'ANYFREEBOOK',
  };
  const s = source || 'local';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[s] || colors.local}`}>
      {labels[s] || s}
    </span>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [activeSource, setActiveSource] = useState('all');
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (q: string, source = 'all') => {
    if (!q.trim()) { setResults([]); setTotal(0); setSources({}); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResults([]);
    setTotal(0);
    setSources({});
    setLoading(true);

    try {
      const res = await fetch(`/api/search-stream?q=${encodeURIComponent(q)}&source=${source}`, {
        signal: controller.signal,
      });
      if (!res.body) { setLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === 'source') {
            setResults(prev => [...prev, ...msg.books]);
            setSources(prev => ({ ...prev, [msg.label]: msg.total }));
            setTotal(prev => prev + (msg.total || 0));
          }
        }
      }
      setLoading(false);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) doSearch(query, activeSource);
  }, [query, activeSource, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="content-wrapper py-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)] mb-6">
          Search 5M+ free books
        </h1>
        <form onSubmit={handleSubmit} className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title, author, subject, ISBN..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
        </form>
      </div>

      {query && (
        <>
          {/* Source tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setActiveSource('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSource === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
            >
              All Sources
            </button>
            {[
              { id: 'openlibrary', label: 'Open Library', count: sources['Open Library'] },
              { id: 'gutenberg', label: 'Gutenberg', count: sources['Project Gutenberg'] },
              { id: 'googlebooks', label: 'Google Books', count: sources['Google Books'] },
              { id: 'archive', label: 'Internet Archive', count: sources['Internet Archive'] },
              { id: 'pubmed', label: 'PubMed Central', count: sources['PubMed Central'] },
              { id: 'doaj', label: 'DOAJ', count: sources['DOAJ'] },
              { id: 'local', label: 'Curated', count: sources['ANYFREEBOOK'] },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSource(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSource === s.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
              >
                {s.label} {s.count !== undefined && <span className="ml-1 opacity-70">({s.count?.toLocaleString()})</span>}
              </button>
            ))}
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-4">
            {loading
              ? `Finding results... ${results.length > 0 ? `(${results.length.toLocaleString()} so far)` : ''}`
              : `${total.toLocaleString()}+ results for "${query}"`}
          </p>
        </>
      )}

      {loading && results.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
              <div className="flex gap-3">
                <div className="w-16 h-24 rounded bg-[var(--bg-secondary)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[var(--bg-secondary)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--bg-secondary)]" />
                  <div className="h-3 w-1/3 rounded bg-[var(--bg-secondary)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((book) => (
            <div
              key={book.id}
              className="group rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--border)] hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex gap-3">
                  {/* Cover */}
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={`Cover of ${book.title}`}
                      className="w-16 h-24 rounded-lg object-cover flex-shrink-0 shadow-sm"
                      loading="lazy"
                    />
                  ) : (
                    <BookCover title={book.title} author={book.author} size="sm" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <SourceBadge source={book.sourceType} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">FREE</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2 leading-tight">
                      {book.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{book.author}</p>
                    {book.publishYear && book.publishYear > 0 && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{book.publishYear}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {book.formats.slice(0, 3).map(f => (
                        <span key={f} className="text-[9px] px-1 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] font-medium">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-[var(--border-subtle)] px-4 py-2.5 flex items-center gap-2">
                <button
                  onClick={() => setPreviewBook(book)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary-light)] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </button>
                {book.downloadLinks && book.downloadLinks.length > 0 ? (
                  <a
                    href={book.downloadLinks[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-semibold hover:shadow-md transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                    {book.downloadLinks[0].label}
                  </a>
                ) : book.sourceUrl ? (
                  <a
                    href={book.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-semibold hover:shadow-md transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                    Read Free
                  </a>
                ) : (
                  <a
                    href={`/book/${book.slug}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-semibold hover:shadow-md transition-all"
                  >
                    View Details
                  </a>
                )}

                {book.downloadLinks && book.downloadLinks.length > 1 && (
                  <div className="relative group/more">
                    <button className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all z-10">
                      {book.downloadLinks.slice(1).map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] first:rounded-t-xl last:rounded-b-xl transition-colors"
                        >
                          {link.label}
                          <span className="block text-[10px] text-[var(--text-muted)]">{link.source}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No books found</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Try different keywords or browse categories</p>
        </div>
      )}

      {!query && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📚</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">Search millions of free books, textbooks & research papers</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Aggregated live from 6 open-access sources
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-xs text-[var(--text-muted)]">
            <span>📖 Open Library</span>
            <span>📜 Project Gutenberg</span>
            <span>📗 Google Books</span>
            <span>🏛️ Internet Archive</span>
            <span>🔬 PubMed Central</span>
            <span>📰 DOAJ</span>
          </div>
        </div>
      )}

      {previewBook && (
        <BookPreviewModal book={previewBook} onClose={() => setPreviewBook(null)} />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="content-wrapper py-8"><p>Loading...</p></div>}>
      <SearchResults />
    </Suspense>
  );
}
