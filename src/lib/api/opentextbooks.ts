import { fetchUpstreamJson } from './http';
import type { Book } from '../data';

/**
 * The Open Textbook Library — peer-reviewed open textbooks.
 *
 * Why it is here: we recommend OpenStax, MIT OpenCourseWare and LibreTexts in
 * our own answers, and could not search any of them. This is the one with a
 * clean, machine-readable catalogue — every record states its licence, its
 * publisher, its ISBNs and the formats it can be read or downloaded in, all
 * priced at zero. So the tier can be stated rather than guessed.
 *
 * The catalogue is 2,039 books, served as JSON with a `q` parameter that does
 * the searching server-side and reports an accurate total. Asking it for
 * `?q=python` returns the 38 books about python and says so; asking for
 * `?q=zzzznotathing` returns none, rather than everything.
 */

interface OtlContributor {
  id?: number;
  contribution?: string;
  primary?: boolean;
  corporate?: boolean;
  name?: string;
  title?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  location?: string | null;
}

interface OtlFormat {
  id?: number;
  type?: string;
  url?: string;
  price?: { cents?: number; currency_iso?: string };
  isbn?: string | null;
}

interface OtlTextbook {
  id: number;
  title: string;
  description?: string;
  license?: string;
  language?: string;
  copyright_year?: number;
  isbn10?: string;
  isbn13?: string;
  url?: string;
  rating?: number;
  textbook_reviews_count?: number;
  contributors?: OtlContributor | OtlContributor[];
  publishers?: { name?: string }[];
  subjects?: { name?: string }[];
  formats?: OtlFormat[];
}

interface OtlResponse {
  data?: OtlTextbook[];
  links?: { total_pages?: number; total_count?: number };
}

/** The library serves ten books per page. */
const OTL_PAGE_SIZE = 10;

async function fetchOtlPage(query: string, page: number): Promise<OtlResponse> {
  const url = `https://open.umn.edu/opentextbooks/textbooks.json?q=${encodeURIComponent(query)}&page=${page}`;
  // The library answers a query with no matching textbooks with HTTP 200 and an
  // empty data list, so an error status means the upstream did not answer and is
  // thrown — otherwise a broken library would look like an empty catalogue.
  const data = await fetchUpstreamJson<OtlResponse>(
    url,
    {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'anyfreebook/1.0 (https://anyfreebook.com)' },
    },
    { source: 'Open Textbook Library' }
  );
  return data || {};
}

function contributorName(contributor: OtlContributor): string {
  if (contributor.name) return contributor.name;
  return [contributor.title, contributor.first_name, contributor.middle_name, contributor.last_name]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' ');
}

function authorsOf(book: OtlTextbook): string[] {
  const raw = book.contributors;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const authors = list
    .filter(c => (c.contribution || '').toLowerCase() === 'author')
    .map(contributorName)
    .filter(Boolean);
  if (authors.length) return authors;
  return list.map(contributorName).filter(Boolean);
}

/** Direct files, from the format list. Every one of them is priced at zero. */
function filesOf(book: OtlTextbook): { format: string; url: string; label: string }[] {
  const files: { format: string; url: string; label: string }[] = [];
  for (const format of book.formats || []) {
    if (!format.url) continue;
    if ((format.price?.cents ?? 0) !== 0) continue; // a paid format is not free
    const type = (format.type || '').toUpperCase();
    if (type === 'PDF') files.push({ format: 'pdf', url: format.url, label: 'PDF' });
    else if (['EBOOK', 'ONLINE', 'XML', 'ODF', 'HTML'].includes(type)) {
      files.push({ format: 'html', url: format.url, label: type === 'EBOOK' ? 'Read online' : type });
    }
  }
  const seen = new Set<string>();
  return files.filter(f => !seen.has(f.format) && seen.add(f.format));
}

function textbookToBook(book: OtlTextbook): Book | null {
  if (!book.title) return null;

  const id = String(book.id);
  const authors = authorsOf(book);
  const publisher = book.publishers?.[0]?.name || 'the Open Textbook Library';
  const files = filesOf(book);
  const slug = `${book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)}-otl-${id}`.slice(0, 100);

  const links = [
    { label: 'Read on the Open Textbook Library', url: book.url || '', source: 'Open Textbook Library' },
    ...files.map(f => ({ label: f.label, url: f.url, source: 'Open Textbook Library' })),
  ].filter(l => l.url);

  return {
    id: `otl-${id}`,
    title: book.title,
    author: authors.slice(0, 4).join(', ') || publisher,
    slug,
    coverUrl: null,
    description:
      ((book.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)) +
      (book.license ? ` Licensed ${book.license}.` : ''),
    rating: book.rating || 0,
    ratingCount: book.textbook_reviews_count || 0,
    contentType: 'BOOK',
    formats: files.map(f => f.label.toUpperCase()),
    viewCount: 0,
    likeCount: 0,
    publishYear: book.copyright_year || undefined,
    isbn: book.isbn13 || book.isbn10 || undefined,
    publisher,
    language: (book.language || 'en').slice(0, 3),
    category: { name: 'Education', slug: 'free-education-books' },
    sourceUrl: book.url || '',
    sourceType: 'otl' as const,
    downloadLinks: links,
  };
}

/**
 * Search the Open Textbook Library.
 *
 * The library does the matching, so this is one request per page of results
 * and the total is the library's own count rather than an estimate.
 */
export async function searchOpenTextbooks(
  query: string,
  page = 1,
  pageSize = 20
): Promise<{ books: Book[]; total: number }> {
  // Ten books per library page; ours is twenty, so ask for two.
  const pagesNeeded = Math.max(1, Math.ceil(pageSize / OTL_PAGE_SIZE));
  const firstOtlPage = (Math.max(1, page) - 1) * pagesNeeded + 1;

  // The first page is fetched once and reused: it carries the library's own
  // total count and is also the first page of the results, so asking for it
  // twice would spend a request on nothing.
  const first = await fetchOtlPage(query, firstOtlPage);
  const total = first.links?.total_count ?? 0;

  const pages = await Promise.all(
    Array.from({ length: pagesNeeded }, (_, i) =>
      i === 0 ? Promise.resolve(first) : fetchOtlPage(query, firstOtlPage + i)
    )
  );

  const raw = pages.flatMap((p) => (p?.data ? p.data : []));
  const books = raw.map(textbookToBook).filter((b): b is Book => b !== null);

  return { books, total };
}
