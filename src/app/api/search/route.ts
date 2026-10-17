import { NextRequest, NextResponse } from 'next/server';
import { searchOpenLibrary } from '@/lib/api/openlibrary';
import { searchGutenberg } from '@/lib/api/gutenberg';
import { searchGoogleBooks } from '@/lib/api/googlebooks';
import { searchArchive } from '@/lib/api/archive';
import { searchPubMed } from '@/lib/api/pubmed';
import { searchDOAJ } from '@/lib/api/doaj';
import { searchBooks as searchLocal, type Book } from '@/lib/data';
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

  const results: { books: Book[]; total: number; sources: Record<string, number>; failedSources: string[] } = {
    books: [],
    total: 0,
    sources: {},
    failedSources: [],
  };

  try {
    const fetches: Promise<void>[] = [];

    if (source === 'all' || source === 'local') {
      fetches.push(
        (async () => {
          const local = searchLocal(query);
          results.books.push(...local.map(b => ({ ...b, sourceType: 'local' as const })));
          results.sources['ANYFREEBOOK'] = local.length;
        })()
      );
    }

    if (source === 'all' || source === 'openlibrary') {
      fetches.push(
        (async () => {
          try {
            const ol = await searchOpenLibrary(query, 20, page);
            results.books.push(...ol.books);
            results.sources['Open Library'] = ol.total;
            results.total += ol.total;
          } catch {
            // Record it: a silently short result set reads as 'nothing matched',
            // which is a different (and wrong) answer to 'the source failed'.
            results.failedSources.push('Open Library');
          }
        })()
      );
    }

    if (source === 'all' || source === 'gutenberg') {
      fetches.push(
        (async () => {
          try {
            const pg = await searchGutenberg(query, page);
            results.books.push(...pg.books);
            results.sources['Project Gutenberg'] = pg.total;
            results.total += pg.total;
          } catch {
            // Record it: a silently short result set reads as 'nothing matched',
            // which is a different (and wrong) answer to 'the source failed'.
            results.failedSources.push('Project Gutenberg');
          }
        })()
      );
    }

    if (source === 'all' || source === 'googlebooks') {
      fetches.push(
        (async () => {
          try {
            const gb = await searchGoogleBooks(query, (page - 1) * 20, 20);
            results.books.push(...gb.books);
            results.sources['Google Books'] = gb.total;
            results.total += gb.total;
          } catch {
            // Record it: a silently short result set reads as 'nothing matched',
            // which is a different (and wrong) answer to 'the source failed'.
            results.failedSources.push('Google Books');
          }
        })()
      );
    }

    if (source === 'all' || source === 'archive') {
      fetches.push(
        (async () => {
          try {
            const ia = await searchArchive(query, page);
            results.books.push(...ia.books);
            results.sources['Internet Archive'] = ia.total;
            results.total += ia.total;
          } catch {
            // Record it: a silently short result set reads as 'nothing matched',
            // which is a different (and wrong) answer to 'the source failed'.
            results.failedSources.push('Internet Archive');
          }
        })()
      );
    }

    if (source === 'all' || source === 'pubmed') {
      fetches.push(
        (async () => {
          try {
            const pm = await searchPubMed(query, (page - 1) * 20, 20);
            results.books.push(...pm.books);
            results.sources['PubMed Central'] = pm.total;
            results.total += pm.total;
          } catch {
            // Record it: a silently short result set reads as 'nothing matched',
            // which is a different (and wrong) answer to 'the source failed'.
            results.failedSources.push('PubMed Central');
          }
        })()
      );
    }

    if (source === 'all' || source === 'doaj') {
      fetches.push(
        (async () => {
          try {
            const dj = await searchDOAJ(query, page);
            results.books.push(...dj.books);
            results.sources['DOAJ'] = dj.total;
            results.total += dj.total;
          } catch {
            // Record it: a silently short result set reads as 'nothing matched',
            // which is a different (and wrong) answer to 'the source failed'.
            results.failedSources.push('DOAJ');
          }
        })()
      );
    }

    await Promise.all(fetches);

    // Drop any result without a usable, resolvable destination link (slug alone doesn't
    // count — every Book always has one, so it can't signal a real source was found)
    results.books = results.books.filter(b => !!(b.sourceUrl || (b.downloadLinks && b.downloadLinks.length > 0)));

    const seen = new Set<string>();
    results.books = results.books.filter(b => {
      const key = `${b.title.toLowerCase().slice(0, 40)}-${b.author?.toLowerCase().slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  } catch (error) {
    // The outer guard catches orchestration bugs only. Per-source failures are
    // already captured in failedSources by the handlers above.
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed unexpectedly. Please try again.' },
      { status: 500 }
    );
  }

  // `partial` lets the UI say "these sources didn't answer" rather than
  // presenting a short list as though it were the complete result set.
  const payload = { ...results, partial: results.failedSources.length > 0 };
  return NextResponse.json(payload);
}
