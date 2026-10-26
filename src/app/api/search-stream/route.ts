import { NextRequest } from 'next/server';
import { searchOpenLibrary } from '@/lib/api/openlibrary';
import { searchGutenberg } from '@/lib/api/gutenberg';
import { searchGoogleBooks } from '@/lib/api/googlebooks';
import { searchArchive } from '@/lib/api/archive';
import { searchPubMed } from '@/lib/api/pubmed';
import { searchDOAJ } from '@/lib/api/doaj';
import { searchOpenAlex } from '@/lib/api/openalex';
import { searchWikisource } from '@/lib/api/wikisource';
import { searchEuropeana } from '@/lib/api/europeana';
import { searchZenodo } from '@/lib/api/zenodo';
import { searchOpenTextbooks } from '@/lib/api/opentextbooks';
import { searchBooks as searchLocal, type Book } from '@/lib/data';
import { rateLimit, clientIp } from '@/lib/rateLimit';

interface SourceJob {
  id: string;
  label: string;
  run: () => Promise<{ books: Book[]; total: number }>;
}

export async function GET(request: NextRequest) {
  // Each request fans out to up to 11 external book APIs at once — cap per-IP
  // so a traffic spike can't get those providers to rate-limit or block us.
  const rl = rateLimit(`search:${clientIp(request.headers)}`, 30, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSec) },
    });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const requestedSource = searchParams.get('source') || 'all';

  if (!query.trim()) {
    // A 200 with an empty body breaks the NDJSON consumer: it never sees the
    // terminal `{ type: 'done' }` line and has to special-case "stream ended
    // with nothing". A 400 is the honest answer for a missing query.
    return new Response(JSON.stringify({ error: 'Missing search query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jobs: SourceJob[] = [
    { id: 'local', label: 'ANYFREEBOOK', run: async () => { const b = searchLocal(query); return { books: b.map(x => ({ ...x, sourceType: 'local' as const })), total: b.length }; } },
    { id: 'openlibrary', label: 'Open Library', run: () => searchOpenLibrary(query, 20, page) },
    { id: 'gutenberg', label: 'Project Gutenberg', run: () => searchGutenberg(query, page) },
    { id: 'googlebooks', label: 'Google Books', run: () => searchGoogleBooks(query, (page - 1) * 20, 20) },
    { id: 'archive', label: 'Internet Archive', run: () => searchArchive(query, page) },
    { id: 'pubmed', label: 'PubMed Central', run: () => searchPubMed(query, (page - 1) * 20, 20) },
    { id: 'doaj', label: 'DOAJ', run: () => searchDOAJ(query, page) },
    { id: 'openalex', label: 'OpenAlex', run: () => searchOpenAlex(query, page, 20) },
    { id: 'wikisource', label: 'Wikisource', run: () => searchWikisource(query, page, 20) },
    { id: 'europeana', label: 'Europeana', run: () => searchEuropeana(query, page, 20) },
    { id: 'zenodo', label: 'Zenodo', run: () => searchZenodo(query, page, 20) },
    { id: 'otl', label: 'Open Textbook Library', run: () => searchOpenTextbooks(query, page, 20) },
  ].filter(j => requestedSource === 'all' || requestedSource === j.id);

  const seen = new Set<string>();
  const dedupe = (books: Book[]) => books.filter(b => {
    const hasLink = !!(b.sourceUrl || (b.downloadLinks && b.downloadLinks.length > 0));
    if (!hasLink) return false;
    const key = `${b.title.toLowerCase().slice(0, 40)}-${b.author?.toLowerCase().slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      await Promise.all(
        jobs.map(async job => {
          try {
            const result = await job.run();
            const books = dedupe(result.books);
            enqueue({ type: 'source', id: job.id, label: job.label, books, total: result.total });
            // Wikisource is a fan-out of separate wikis, one per language. An
            // edition that did not answer costs that edition, not the whole
            // source, so it is named individually rather than reporting all of
            // Wikisource as failed.
            const failedLanguages = (result as { failedLanguages?: string[] }).failedLanguages;
            for (const lang of failedLanguages || []) {
              enqueue({ type: 'source', id: `${job.id}-${lang}`, label: `${job.label} (${lang})`, books: [], total: 0, error: true });
            }
          } catch {
            enqueue({ type: 'source', id: job.id, label: job.label, books: [], total: 0, error: true });
          }
        })
      );

      enqueue({ type: 'done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
