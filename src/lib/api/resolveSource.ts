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
}

/** True if `authors` (as returned by Gutendex, "Lastname, Firstname") plausibly names the same person as `author`. */
function authorMatches(author: string, authors: { name: string }[] | undefined): boolean {
  if (!authors || authors.length === 0) return false;
  const tokens = author.toLowerCase().split(/[\s,&]+/).filter(t => t.length >= 3);
  const combined = authors.map(a => a.name.toLowerCase()).join(' | ');
  return tokens.some(t => combined.includes(t));
}

/** Asks Internet Archive's own metadata API whether an item is open or a Controlled-Digital-Lending "borrow" record. */
async function isArchiveItemRestricted(identifier: string): Promise<boolean> {
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, { next: { revalidate: 86400 }, signal: UPSTREAM_TIMEOUT() });
    if (!res.ok) return true; // unknown → treat conservatively as restricted
    const data = await res.json();
    return data?.metadata?.['access-restricted-item'] === 'true' || !!data?.metadata?.lending_identifier_lending;
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
      const match = data.results?.find((r: { authors?: { name: string }[] }) => authorMatches(author, r.authors));
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
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=1&fields=key,ia,edition_key`,
      { next: { revalidate: 86400 }, signal: UPSTREAM_TIMEOUT() }
    );
    if (res.ok) {
      const data = await res.json();
      const doc: OLDoc | undefined = data.docs?.[0];
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
