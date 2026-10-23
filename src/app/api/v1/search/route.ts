import { NextRequest } from 'next/server';
import { searchAllSources, SEARCH_SOURCES, type SearchSource } from '@/lib/api/searchAll';
import { toPublicRecord, mapWithConcurrency, type PublicRecord } from '@/lib/api/publicRecords';
import { guard, json, meta, handlePreflight } from '@/lib/api/v1';

/**
 * GET /api/v1/search?q=<query>&page=<n>&source=<name>&limit=<n>
 *
 * The public search. It returns the same books the website searches for, but
 * with the one thing the website's raw payload does not carry: a legal tier
 * per result, plus the real file URLs when a free download actually exists.
 */

const MAX_QUERY_LENGTH = 200;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
/** How many Internet Archive metadata lookups one request may make. */
const IA_LOOKUP_CONCURRENCY = 6;

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function GET(request: NextRequest) {
  const { key, response } = await guard(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const rawSource = searchParams.get('source') || 'all';
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  if (!query) {
    return json(request, { error: 'Missing required parameter: q' }, 400);
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return json(request, { error: `Search query is too long (max ${MAX_QUERY_LENGTH} characters).` }, 400);
  }
  if (!(SEARCH_SOURCES as string[]).includes(rawSource)) {
    return json(request, { error: `Unknown source: ${rawSource}. Valid: ${SEARCH_SOURCES.join(', ')}` }, 400);
  }

  const source = rawSource as SearchSource;

  try {
    const outcome = await searchAllSources(query, page, source, { includeLibrivox: true });
    const books = outcome.books.slice(0, limit);

    // Resolving the Internet Archive tier needs one metadata call per item.
    // Do it in parallel but bounded, so a 50-result page cannot fire 50
    // requests at once.
    const records: PublicRecord[] = await mapWithConcurrency(books, IA_LOOKUP_CONCURRENCY, async book => {
      return toPublicRecord(book);
    });

    return json(request, {
      query,
      page,
      limit,
      total: outcome.total,
      count: records.length,
      sources: outcome.sources,
      failedSources: outcome.failedSources,
      partial: outcome.failedSources.length > 0,
      results: records,
      meta: meta({
        tier: 'download | borrow | unverified — what is actually free to read for this title.',
        caller: key?.label,
      }),
    });
  } catch (error) {
    console.error('[api/v1/search] failed:', error);
    return json(request, { error: 'Search failed. Please try again.' }, 500);
  }
}
