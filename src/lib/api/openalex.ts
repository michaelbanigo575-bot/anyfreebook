import { UPSTREAM_TIMEOUT } from './http';
import type { Book } from '../data';

/**
 * OpenAlex — an index of scholarly works with their open-access copies.
 *
 * Why it is here: it is the cheapest way to know that an open-access copy
 * exists before spending a request on a file-bearing source. It is also the
 * only source in the fan-out that knows which papers are genuinely open
 * access, so it is the one that can be trusted to say "free".
 *
 * Only works that OpenAlex itself marks as open access are returned. A
 * paywalled work is not a free book, and surfacing one would be the exact
 * failure the tier system exists to prevent.
 */

interface OpenAlexAuthor {
  author?: { display_name?: string };
}

interface OpenAlexLocation {
  pdf_url?: string | null;
  landing_page_url?: string | null;
  source?: { display_name?: string } | null;
}

interface OpenAlexWork {
  id: string;
  title?: string;
  display_name?: string;
  publication_year?: number;
  language?: string | null;
  type?: string;
  open_access?: {
    is_oa?: boolean;
    oa_status?: string | null;
  };
  best_oa_location?: OpenAlexLocation | null;
  primary_location?: OpenAlexLocation | null;
  authorships?: OpenAlexAuthor[];
}

interface OpenAlexResponse {
  meta?: { count?: number };
  results?: OpenAlexWork[];
}

/** OpenAlex asks for a contact address so it can include you in the polite pool. */
const MAILTO = process.env.OPENALEX_MAILTO || 'hello@anyfreebook.com';

function workToBook(work: OpenAlexWork): Book | null {
  const title = work.title || work.display_name;
  if (!title) return null;

  const location = work.best_oa_location || work.primary_location;
  const pdf = location?.pdf_url || null;
  const landing = location?.landing_page_url || null;
  if (!pdf && !landing) return null;

  const id = (work.id || '').split('/').pop() || Math.abs(hash(title)).toString();
  const authors = (work.authorships || [])
    .map(a => a.author?.display_name)
    .filter((n): n is string => Boolean(n));

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)}-openalex-${id}`.slice(0, 100);

  return {
    id: `openalex-${id}`,
    title,
    author: authors.slice(0, 4).join(', ') || 'Unknown Author',
    slug,
    coverUrl: null,
    description:
      `Open-access work from ${location?.source?.display_name || 'an open-access repository'}. ` +
      `OpenAlex reports its open-access status as "${work.open_access?.oa_status || 'open'}".`,
    rating: 0,
    ratingCount: 0,
    contentType: 'BOOK',
    formats: pdf ? ['PDF'] : ['HTML'],
    viewCount: 0,
    likeCount: 0,
    publishYear: work.publication_year,
    language: work.language || 'en',
    category: { name: 'Sciences', slug: 'free-science-books' },
    sourceUrl: landing || pdf || '',
    sourceType: 'openalex' as const,
    downloadLinks: pdf
      ? [{ label: 'Download the open-access PDF', url: pdf, source: 'OpenAlex' }]
      : [{ label: 'Read the open-access copy', url: landing as string, source: 'OpenAlex' }],
  };
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Search OpenAlex for open-access works.
 *
 * The `is_oa:true` filter is applied server-side, so a paywalled record never
 * reaches us in the first place.
 */
export async function searchOpenAlex(
  query: string,
  page = 1,
  pageSize = 20
): Promise<{ books: Book[]; total: number }> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}` +
    `&filter=is_oa:true&per-page=${pageSize}&page=${Math.max(1, page)}` +
    `&mailto=${encodeURIComponent(MAILTO)}`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { 'User-Agent': `anyfreebook/1.0 (mailto:${MAILTO})` },
    signal: UPSTREAM_TIMEOUT(),
  });
  if (!res.ok) return { books: [], total: 0 };

  const data: OpenAlexResponse = await res.json();
  const books = (data.results || []).map(workToBook).filter((b): b is Book => b !== null);
  return { books, total: data.meta?.count ?? books.length };
}
