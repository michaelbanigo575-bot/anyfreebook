import { fetchUpstreamJson } from './http';
import type { Book } from '../data';

/**
 * Zenodo — the CERN repository of open research, including books.
 *
 * Why it is here: it is the rare source that hands over a *real file* with a
 * *clear licence* attached to it. Most open indexes give you a link and leave
 * you to work out whether the PDF is actually free; a Zenodo record carries
 * both the licence and the direct download URL, so the tier can be stated
 * without guessing.
 *
 * Only records with access_right "open" are returned.
 */

interface ZenodoFile {
  key: string;
  size?: number;
  type?: string;
  links?: { self?: string; content?: string };
}

interface ZenodoRecord {
  id: number;
  metadata: {
    title?: string;
    description?: string;
    access_right?: string;
    publication_date?: string;
    creators?: { name?: string }[];
    license?: { id?: string; title?: string };
    resource_type?: { title?: string };
    language?: string;
    subject?: { subject?: string }[];
    related_identifiers?: { identifier?: string; relation?: string }[];
  };
  files?: ZenodoFile[];
}

interface ZenodoResponse {
  hits?: { total?: number; hits?: ZenodoRecord[] };
}

/** How a Zenodo licence identifier reads on the card. */
function licenseLabel(id: string | undefined): string {
  if (!id) return 'Open access (Zenodo)';
  const map: Record<string, string> = {
    'cc-by-4.0': 'CC BY 4.0',
    'cc-by-3.0': 'CC BY 3.0',
    'cc-by-sa-4.0': 'CC BY-SA 4.0',
    'cc-by-sa-3.0': 'CC BY-SA 3.0',
    'cc0-1.0': 'CC0 (public domain dedication)',
    'cc-by-nc-sa-4.0': 'CC BY-NC-SA 4.0',
    'cc-by-nc-4.0': 'CC BY-NC 4.0',
    'cc-by-nd-4.0': 'CC BY-ND 4.0',
    'cc-pd-mark': 'Public domain mark',
  };
  return map[id.toLowerCase()] || `Open access (${id})`;
}

function recordToBook(record: ZenodoRecord): Book | null {
  const meta = record.metadata;
  const title = meta.title;
  if (!title) return null;
  if (meta.access_right && meta.access_right !== 'open') return null;

  // Prefer a file we can actually fetch: PDF first, then anything else.
  const files = record.files || [];
  const direct = files.find(f => f.links?.self && /\.pdf$/i.test(f.key)) || files.find(f => f.links?.self);
  const fileUrl = direct?.links?.self || '';
  const landing = `https://zenodo.org/records/${record.id}`;

  const authors = (meta.creators || []).map(c => c.name).filter((n): n is string => Boolean(n));
  const id = String(record.id);
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)}-zenodo-${id}`.slice(0, 100);

  const links = [{ label: 'Read on Zenodo', url: landing, source: 'Zenodo' }];
  if (fileUrl) {
    links.unshift({
      label: `Download the ${(direct?.key.split('.').pop() || 'file').toUpperCase()}`,
      url: fileUrl,
      source: 'Zenodo',
    });
  }

  return {
    id: `zenodo-${id}`,
    title,
    author: authors.slice(0, 4).join(', ') || 'Unknown Author',
    slug,
    coverUrl: null,
    description:
      (meta.description ? meta.description.replace(/<[^>]+>/g, ' ').slice(0, 180) : '') +
      ` Published on Zenodo under ${licenseLabel(meta.license?.id)}.`,
    rating: 0,
    ratingCount: 0,
    contentType: 'BOOK',
    formats: direct?.key.endsWith('.pdf') ? ['PDF'] : ['HTML'],
    viewCount: 0,
    likeCount: 0,
    publishYear: meta.publication_date ? parseInt(meta.publication_date) : undefined,
    language: meta.language || 'en',
    category: { name: 'Sciences', slug: 'free-science-books' },
    sourceUrl: landing,
    sourceType: 'zenodo' as const,
    downloadLinks: links,
  };
}

/** Search Zenodo for open-access records. */
export async function searchZenodo(
  query: string,
  page = 1,
  pageSize = 20
): Promise<{ books: Book[]; total: number }> {
  const url =
    `https://zenodo.org/api/records?q=${encodeURIComponent(query)}` +
    `&size=${pageSize}&page=${Math.max(1, page)}&sort=bestmatch`;

  // Zenodo answers a query with no matching records with HTTP 200 and zero
  // hits, so an error status means the upstream did not answer and is thrown
  // for the caller to record as a failed source.
  const data = await fetchUpstreamJson<ZenodoResponse>(
    url,
    {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'anyfreebook/1.0 (https://anyfreebook.com)' },
    },
    { source: 'Zenodo' }
  );
  if (!data) return { books: [], total: 0 };

  const books = (data.hits?.hits || []).map(recordToBook).filter((b): b is Book => b !== null);
  return { books, total: data.hits?.total ?? books.length };
}
