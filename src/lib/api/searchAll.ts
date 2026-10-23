import { searchOpenLibrary } from './openlibrary';
import { searchGutenberg } from './gutenberg';
import { searchGoogleBooks } from './googlebooks';
import { searchArchive } from './archive';
import { searchPubMed } from './pubmed';
import { searchDOAJ } from './doaj';
import { searchLibrivox } from './librivox';
import { searchBooks as searchLocal, type Book } from '@/lib/data';

/**
 * The one search fan-out, shared by the website's /api/search and the public
 * /api/v1/search so the two can never disagree about what a source returned.
 *
 * Every source is asked at once and each failure is recorded rather than
 * swallowed: a short result set must never be presented as "that is all there
 * is" when the truth is "one of the sources did not answer".
 */

export type SearchSource =
  | 'all'
  | 'local'
  | 'gutenberg'
  | 'openlibrary'
  | 'archive'
  | 'googlebooks'
  | 'pubmed'
  | 'doaj'
  | 'librivox';

export const SEARCH_SOURCES: SearchSource[] = [
  'all',
  'local',
  'gutenberg',
  'openlibrary',
  'archive',
  'googlebooks',
  'pubmed',
  'doaj',
  'librivox',
];

export interface SearchOutcome {
  books: Book[];
  total: number;
  sources: Record<string, number>;
  failedSources: string[];
}

export async function searchAllSources(
  query: string,
  page: number,
  source: SearchSource,
  options: { includeLibrivox?: boolean } = {}
): Promise<SearchOutcome> {
  const results: SearchOutcome = { books: [], total: 0, sources: {}, failedSources: [] };
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
          results.failedSources.push('DOAJ');
        }
      })()
    );
  }

  // LibriVox is opt-in for 'all'. The website serves audiobooks from its own
  // /audiobooks page and a title-prefix search would flood the mixed search
  // with recordings; the public API includes it so that "all" really does mean
  // all seven open-access sources.
  if (source === 'librivox' || (source === 'all' && options.includeLibrivox)) {
    fetches.push(
      (async () => {
        try {
          const lv = await searchLibrivox(query, 20);
          results.books.push(...lv.books);
          results.sources['LibriVox'] = lv.total;
          results.total += lv.total;
        } catch {
          results.failedSources.push('LibriVox');
        }
      })()
    );
  }

  await Promise.all(fetches);

  // Drop anything without a usable, resolvable destination link (a slug alone
  // doesn't count — every Book always has one, so it can't signal a real
  // source was found).
  results.books = results.books.filter(b => !!(b.sourceUrl || (b.downloadLinks && b.downloadLinks.length > 0)));

  const seen = new Set<string>();
  results.books = results.books.filter(b => {
    const key = `${b.title.toLowerCase().slice(0, 40)}-${b.author?.toLowerCase().slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return results;
}
