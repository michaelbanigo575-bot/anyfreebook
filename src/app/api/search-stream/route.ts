import { NextRequest } from 'next/server';
import { searchOpenLibrary } from '@/lib/api/openlibrary';
import { searchGutenberg } from '@/lib/api/gutenberg';
import { searchGoogleBooks } from '@/lib/api/googlebooks';
import { searchArchive } from '@/lib/api/archive';
import { searchPubMed } from '@/lib/api/pubmed';
import { searchDOAJ } from '@/lib/api/doaj';
import { searchBooks as searchLocal, type Book } from '@/lib/data';
import { rateLimit, clientIp } from '@/lib/rateLimit';

interface SourceJob {
  id: string;
  label: string;
  run: () => Promise<{ books: Book[]; total: number }>;
}

export async function GET(request: NextRequest) {
  // Each request fans out to up to 6 external book APIs at once — cap per-IP
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
    return new Response('', { status: 200 });
  }

  const jobs: SourceJob[] = [
    { id: 'local', label: 'ANYFREEBOOK', run: async () => { const b = searchLocal(query); return { books: b.map(x => ({ ...x, sourceType: 'local' as const })), total: b.length }; } },
    { id: 'openlibrary', label: 'Open Library', run: () => searchOpenLibrary(query, 20, page) },
    { id: 'gutenberg', label: 'Project Gutenberg', run: () => searchGutenberg(query, page) },
    { id: 'googlebooks', label: 'Google Books', run: () => searchGoogleBooks(query, (page - 1) * 20, 20) },
    { id: 'archive', label: 'Internet Archive', run: () => searchArchive(query, page) },
    { id: 'pubmed', label: 'PubMed Central', run: () => searchPubMed(query, (page - 1) * 20, 20) },
    { id: 'doaj', label: 'DOAJ', run: () => searchDOAJ(query, page) },
  ].filter(j => requestedSource === 'all' || requestedSource === j.id);

  const seen = new Set<string>();
  const dedupe = (books: Book[]) => books.filter(b => {
    const hasLink = !!(b.sourceUrl || (b.downloadLinks && b.downloadLinks.length > 0) || b.slug);
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
