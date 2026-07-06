import { NextRequest, NextResponse } from 'next/server';
import { searchOpenLibrary } from '@/lib/api/openlibrary';
import { searchGutenberg } from '@/lib/api/gutenberg';
import { searchGoogleBooks } from '@/lib/api/googlebooks';
import { searchArchive } from '@/lib/api/archive';
import { searchPubMed } from '@/lib/api/pubmed';
import { searchDOAJ } from '@/lib/api/doaj';
import { searchBooks as searchLocal, type Book } from '@/lib/data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const source = searchParams.get('source') || 'all';

  if (!query.trim()) {
    return NextResponse.json({ books: [], total: 0, sources: {} });
  }

  const results: { books: Book[]; total: number; sources: Record<string, number> } = {
    books: [],
    total: 0,
    sources: {},
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
          } catch {}
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
          } catch {}
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
          } catch {}
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
          } catch {}
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
          } catch {}
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
          } catch {}
        })()
      );
    }

    await Promise.all(fetches);

    // Drop any result without a usable, resolvable destination link
    results.books = results.books.filter(b => {
      const hasLink = !!(b.sourceUrl || (b.downloadLinks && b.downloadLinks.length > 0) || b.slug);
      return hasLink;
    });

    const seen = new Set<string>();
    results.books = results.books.filter(b => {
      const key = `${b.title.toLowerCase().slice(0, 40)}-${b.author?.toLowerCase().slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  } catch (error) {
    console.error('Search error:', error);
  }

  return NextResponse.json(results);
}
