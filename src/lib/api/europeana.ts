import { UPSTREAM_TIMEOUT } from './http';
import type { Book } from '../data';

/**
 * Europeana — the European Union's aggregator of the cultural heritage of
 * museums, archives and, importantly, university libraries.
 *
 * Why it is here: it is the one source that reaches European university
 * library collections directly. A search for "public domain book" against
 * Europeana returns items from institutions like the Digital Library of the
 * Silesian University of Technology, with a licence attached to each record.
 *
 * The licence is the point. Europeana indexes material that is still in
 * copyright, so this adapter only keeps the records whose rights statement
 * is a Creative Commons or public-domain licence. Anything else is not free
 * to redistribute and is left out rather than mislabelled.
 */

interface EuropeanaItem {
  id: string;
  title?: string[];
  type?: string;
  dataProvider?: string[];
  rights?: string[];
  guid?: string;
  dcCreator?: string[];
  dcDescription?: string[];
  edmIsShownAt?: string[];
  edmPreview?: string[];
  year?: string;
}

interface EuropeanaResponse {
  totalResults?: number;
  items?: EuropeanaItem[];
}

/**
 * A shared demonstration key. It works, but it is heavily rate-limited, so a
 * real key is worth setting for production use.
 */
const EUROPEANA_KEY = process.env.EUROPEANA_API_KEY || 'api2demo';

/** Rights statements that mean "free to read and redistribute". */
const OPEN_RIGHTS = /creativecommons\.org|publicdomain|rightsstatements\.org\/vocab\/CC/;

/** How a Europeana rights URL reads on the card. */
function rightsLabel(rights: string): string {
  if (/by-sa/i.test(rights)) return 'CC BY-SA';
  if (/by-nc/i.test(rights)) return 'CC BY-NC';
  if (/by-nd/i.test(rights)) return 'CC BY-ND';
  if (/by\//i.test(rights) || /by-4/i.test(rights)) return 'CC BY';
  if (/publicdomain/i.test(rights)) return 'Public domain';
  if (/zero/i.test(rights)) return 'CC0';
  return 'Open access';
}

function itemToBook(item: EuropeanaItem): Book | null {
  const title = item.title?.[0];
  if (!title) return null;

  const rights = item.rights || [];
  if (!rights.some(r => OPEN_RIGHTS.test(r))) return null;

  const provider = item.dataProvider?.[0] || 'a European cultural heritage institution';
  const url = item.guid || (item.edmIsShownAt?.[0] ?? `https://www.europeana.eu/item${item.id}`);
  const label = rightsLabel(rights[0]);
  const id = item.id.replace(/[^a-zA-Z0-9]/g, '');
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)}-europeana-${id}`.slice(0, 100);

  // Some European records carry a repository URL where a name belongs. A URL
  // is not an author, so fall back to the institution that holds the item.
  const creators = (item.dcCreator || []).filter(c => c && !/^https?:\/\//i.test(c.trim()));
  const author = creators.length > 0 ? creators.join(', ') : provider;

  return {
    id: `europeana-${id}`,
    title,
    author,
    slug,
    coverUrl: item.edmPreview?.[0] || null,
    description:
      `Free to read, licensed ${label}, from ${provider} via Europeana. ` +
      (item.dcDescription?.[0] ? item.dcDescription[0].slice(0, 160) : ''),
    rating: 0,
    ratingCount: 0,
    contentType: 'BOOK',
    formats: ['HTML'],
    viewCount: 0,
    likeCount: 0,
    publishYear: item.year ? parseInt(item.year) : undefined,
    language: 'en',
    category: { name: 'Arts & Humanities', slug: 'free-arts-books' },
    sourceUrl: url,
    sourceType: 'europeana' as const,
    downloadLinks: [
      { label: `Read on Europeana (${label})`, url, source: 'Europeana' },
    ],
  };
}

/**
 * Search Europeana.
 *
 * `reusability=open` is the API-side filter for openly licensed material;
 * the licence check in itemToBook is the second line of defence.
 */
export async function searchEuropeana(
  query: string,
  page = 1,
  pageSize = 20
): Promise<{ books: Book[]; total: number }> {
  const start = (Math.max(1, page) - 1) * pageSize;
  // Europeana answers 400 for start=0, so the first page simply omits it.
  const paging = start > 0 ? `&start=${start}` : '';
  const url =
    `https://api.europeana.eu/record/v2/search.json?wskey=${encodeURIComponent(EUROPEANA_KEY)}` +
    `&query=${encodeURIComponent(query)}&rows=${pageSize}${paging}` +
    `&reusability=open&profile=rich`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { 'User-Agent': 'anyfreebook/1.0 (https://anyfreebook.com)' },
    signal: UPSTREAM_TIMEOUT(),
  });
  if (!res.ok) return { books: [], total: 0 };

  const data: EuropeanaResponse = await res.json();
  const books = (data.items || []).map(itemToBook).filter((b): b is Book => b !== null);
  return { books, total: data.totalResults ?? books.length };
}
