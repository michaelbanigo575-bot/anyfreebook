import { NextRequest, NextResponse } from 'next/server';
import { searchAllSources, SEARCH_SOURCES, type SearchSource } from '@/lib/api/searchAll';
import { rateLimit, clientIp } from '@/lib/rateLimit';

/** Every request here fans out to as many as 7 third-party APIs, so cap it. */
const MAX_QUERY_LENGTH = 200;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  const page = parseInt(searchParams.get('page') || '1');
  const source = searchParams.get('source') || 'all';

  // Each call is a multi-provider fan-out. 30/min per IP keeps a single client
  // from becoming a load problem for the upstreams while staying generous for
  // real browsing (paging + retries rarely exceed a few calls a minute).
  const limit = rateLimit(`search:${clientIp(request.headers)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many searches. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  if (!query) {
    return NextResponse.json({ books: [], total: 0, sources: {}, partial: false });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Search query is too long (max ${MAX_QUERY_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const known = (SEARCH_SOURCES as string[]).includes(source);
  const chosen: SearchSource = known ? (source as SearchSource) : 'all';

  try {
    const results = await searchAllSources(query, page, chosen);

    // `partial` lets the UI say "these sources didn't answer" rather than
    // presenting a short list as though it were the complete result set.
    const payload = {
      books: results.books,
      total: results.total,
      sources: results.sources,
      failedSources: results.failedSources,
      partial: results.failedSources.length > 0,
    };
    return NextResponse.json(payload);
  } catch (error) {
    // The outer guard catches orchestration bugs only. Per-source failures are
    // already captured in failedSources by the shared search.
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed unexpectedly. Please try again.' },
      { status: 500 }
    );
  }
}
