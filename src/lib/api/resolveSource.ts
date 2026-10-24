import { UPSTREAM_TIMEOUT } from './http';
/**
 * How freely and legally this exact title can actually be read:
 * 'download'   — a verified, correctly-matched public-domain full text (Gutenberg).
 * 'borrow'     — a real Internet Archive copy, but confirmed access-restricted
 *                (Controlled Digital Lending — requires a free IA account and a loan,
 *                not a direct download).
 * 'unverified' — nothing better than a catalog record or a generic search page; we
 *                could not confirm a free, legally readable copy of this exact title.
 *
 * This tier is the single source of truth for every "is it free?" claim the site
 * makes — page badge, <title>, meta description, and schema.org Offer. Do NOT
 * hardcode a free claim anywhere else; import this type instead.
 */
export type SourceTier = 'download' | 'borrow' | 'unverified';

export interface ResolvedSource {
  sourceUrl: string;
  sourceType: 'openlibrary' | 'gutenberg' | 'archive' | 'googlebooks';
  downloadLinks: { label: string; url: string; source: string }[];
  tier: SourceTier;
}

interface OLDoc {
  key: string;
  ia?: string[];
  edition_key?: string[];
  title?: string;
  author_name?: string[];
}

/** True if `authors` (as returned by Gutendex, "Lastname, Firstname") plausibly names the same person as `author`. */
function authorMatches(author: string, authors: { name: string }[] | undefined): boolean {
  if (!authors || authors.length === 0) return false;
  const tokens = author.toLowerCase().split(/[\s,&]+/).filter(t => t.length >= 3);
  const combined = authors.map(a => a.name.toLowerCase()).join(' | ');
  return tokens.some(t => combined.includes(t));
}

/** Lowercase, alphanumeric-only, single-spaced. Used to compare titles. */
function normaliseTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * True when a catalogue record is plausibly the title that was asked for.
 *
 * Both Open Library's search and Gutendex's are fuzzy, and a search that takes
 * the top hit returns whatever ranked first — not necessarily the book in the
 * request. Without this check a request for one book resolves to a completely
 * different one, and that other book is then reported as a verified free
 * download, which is exactly the failure this resolver exists to prevent.
 *
 * A record title may carry a subtitle ("Fairy Circles: Tales and Legends…"),
 * so the requested title followed by a subtitle separator still matches. It may
 * not be a different book that merely starts with the same words
 * ("Fairy Circles" must not match "Fairy Circles of the Moon").
 */
function titleMatches(requested: string, record: string | undefined): boolean {
  if (!record) return false;
  const want = requested.trim();
  if (!want) return false;
  if (normaliseTitle(want) === normaliseTitle(record)) return true;
  const lower = record.toLowerCase().trim();
  const wantLower = want.toLowerCase();
  if (!lower.startsWith(wantLower)) return false;
  return /^[:\-–—(\[]/.test(lower.slice(wantLower.length));
}

/** Asks Internet Archive's own metadata API whether an item is open or a Controlled-Digital-Lending "borrow" record. */
async function isArchiveItemRestricted(identifier: string): Promise<boolean> {
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, { next: { revalidate: 86400 }, signal: UPSTREAM_TIMEOUT() });
    if (!res.ok) return true; // unknown → treat conservatively as restricted
    const data = await res.json();
    const metadata = data?.metadata || {};
    // The same three signals publicRecords.ts reads, so both resolvers reach
    // the same verdict about the same item.
    return (
      metadata['access-restricted-item'] === 'true' ||
      !!metadata['lending_identifier'] ||
      !!metadata['lendinginfo']
    );
  } catch {
    return true;
  }
}

/**
 * Finds a real, working external source for a book that doesn't already have one
 * (e.g. the curated catalog entries in data.ts, which are synthetic placeholders).
 * Tries Project Gutenberg (verified public-domain full text) first, then Open Library
 * / Internet Archive (checking whether the IA copy is actually open or borrow-only),
 * and only falls back to generic search-result links as a last resort.
 */
export async function resolveBookSource(title: string, author: string): Promise<ResolvedSource | null> {
  try {
    const res = await fetch(
      `https://gutendex.com/books/?search=${encodeURIComponent(title)}`,
      { next: { revalidate: 86400 }, signal: UPSTREAM_TIMEOUT() }
    );
    if (res.ok) {
      const data = await res.json();
      // The title has to match as well as the author: Gutendex's search is
      // fuzzy, and matching on the author alone can pick a different book
      // that happens to share a surname.
      const match = data.results?.find(
        (r: { title?: string; authors?: { name: string }[] }) =>
          titleMatches(title, r.title) && authorMatches(author, r.authors)
      );
      if (match) {
        const readUrl = match.formats?.['text/html'] || match.formats?.['application/epub+zip'] || `https://www.gutenberg.org/ebooks/${match.id}`;
        return {
          sourceUrl: `https://www.gutenberg.org/ebooks/${match.id}`,
          sourceType: 'gutenberg',
          downloadLinks: [{ label: 'Read on Project Gutenberg', url: readUrl, source: 'Project Gutenberg' }],
          tier: 'download',
        };
      }
    }
  } catch {}

  try {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    // Ask for enough documents to find the right one, and for the title and
    // author fields so the match can actually be verified.
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=10&fields=key,ia,edition_key,title,author_name`,
      { next: { revalidate: 86400 }, signal: UPSTREAM_TIMEOUT() }
    );
    if (res.ok) {
      const data = await res.json();
      const docs: OLDoc[] = data.docs || [];
      // Open Library's search is relevance-ranked, not exact. Take the first
      // document that is actually the title we were asked about — and, when
      // both sides name an author, that the author matches too.
      const doc = docs.find((d) => {
        if (!titleMatches(title, d.title)) return false;
        if (!author || !d.author_name || d.author_name.length === 0) return true;
        return authorMatches(author, d.author_name.map((name) => ({ name })));
      });
      if (doc?.key) {
        const olUrl = `https://openlibrary.org${doc.key}`;
        const links = [{ label: 'View on Open Library', url: olUrl, source: 'Open Library' }];
        if (doc.ia && doc.ia.length > 0) {
          const restricted = await isArchiveItemRestricted(doc.ia[0]);
          links.unshift({
            label: restricted ? 'Borrow on Internet Archive' : 'Read on Internet Archive',
            url: `https://archive.org/details/${doc.ia[0]}`,
            source: 'Internet Archive',
          });
          return { sourceUrl: links[0].url, sourceType: 'archive', downloadLinks: links, tier: restricted ? 'borrow' : 'download' };
        }
        return { sourceUrl: olUrl, sourceType: 'openlibrary', downloadLinks: links, tier: 'unverified' };
      }
    }
  } catch {}

  // Last resort: never leave a book unlinked. Send the reader to live source
  // searches for this exact title — real result pages, but not a confirmed copy.
  const tq = encodeURIComponent(title);
  const taq = encodeURIComponent(`${title} ${author}`.trim());
  return {
    sourceUrl: `https://openlibrary.org/search?q=${taq}`,
    sourceType: 'openlibrary',
    downloadLinks: [
      { label: 'Find on Open Library', url: `https://openlibrary.org/search?q=${taq}`, source: 'Open Library' },
      { label: 'Find on Internet Archive', url: `https://archive.org/search?query=${tq}&and%5B%5D=mediatype%3A%22texts%22`, source: 'Internet Archive' },
      { label: 'Find on Google Books', url: `https://www.google.com/search?tbm=bks&q=${taq}`, source: 'Google Books' },
    ],
    tier: 'unverified',
  };
}
