interface ResolvedSource {
  sourceUrl: string;
  sourceType: 'openlibrary' | 'gutenberg' | 'archive' | 'googlebooks';
  downloadLinks: { label: string; url: string; source: string }[];
}

interface OLDoc {
  key: string;
  ia?: string[];
  edition_key?: string[];
}

/**
 * Finds a real, working external source for a book that doesn't already have one
 * (e.g. the curated catalog entries in data.ts, which are synthetic placeholders).
 * Tries Open Library first since it indexes almost every published title.
 */
export async function resolveBookSource(title: string, author: string): Promise<ResolvedSource | null> {
  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=1&fields=key,ia,edition_key`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const data = await res.json();
      const doc: OLDoc | undefined = data.docs?.[0];
      if (doc?.key) {
        const olUrl = `https://openlibrary.org${doc.key}`;
        const links = [{ label: 'View on Open Library', url: olUrl, source: 'Open Library' }];
        if (doc.ia && doc.ia.length > 0) {
          links.unshift({ label: 'Read on Internet Archive', url: `https://archive.org/details/${doc.ia[0]}`, source: 'Internet Archive' });
        }
        return { sourceUrl: links[0].url, sourceType: doc.ia?.length ? 'archive' : 'openlibrary', downloadLinks: links };
      }
    }
  } catch {}

  try {
    const res = await fetch(
      `https://gutendex.com/books/?search=${encodeURIComponent(title)}`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const data = await res.json();
      const match = data.results?.[0];
      if (match) {
        const readUrl = match.formats?.['text/html'] || match.formats?.['application/epub+zip'] || `https://www.gutenberg.org/ebooks/${match.id}`;
        return {
          sourceUrl: `https://www.gutenberg.org/ebooks/${match.id}`,
          sourceType: 'gutenberg',
          downloadLinks: [{ label: 'Read on Project Gutenberg', url: readUrl, source: 'Project Gutenberg' }],
        };
      }
    }
  } catch {}

  // Last resort: never leave a book unlinked. Send the reader to live source
  // searches for this exact title — real result pages with actual copies.
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
  };
}
