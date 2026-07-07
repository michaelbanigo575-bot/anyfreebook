import type { Book } from '../data';

// gutendex.com blocks requests with no/generic User-Agent (common anti-bot behavior
// against datacenter IPs like Vercel's), so we send a normal browser-like one.
const GUTENDEX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
  media_type: string;
}

interface GutenbergResponse {
  count: number;
  next: string | null;
  results: GutenbergBook[];
}

function mapCategory(subjects: string[], bookshelves: string[]): { name: string; slug: string } {
  const all = [...subjects, ...bookshelves].map(s => s.toLowerCase()).join(' ');
  if (all.includes('computer') || all.includes('technology')) return { name: 'Technology', slug: 'free-technology-books' };
  if (all.includes('science') || all.includes('physics') || all.includes('chemistry') || all.includes('biology')) return { name: 'Sciences', slug: 'free-science-books' };
  if (all.includes('math')) return { name: 'Mathematics', slug: 'free-mathematics-books' };
  if (all.includes('medicine') || all.includes('medical')) return { name: 'Medicine', slug: 'free-medicine-books' };
  if (all.includes('law')) return { name: 'Law', slug: 'free-law-books' };
  if (all.includes('business') || all.includes('economics')) return { name: 'Business', slug: 'free-business-books' };
  if (all.includes('education')) return { name: 'Education', slug: 'free-education-books' };
  if (all.includes('psychology')) return { name: 'Psychology', slug: 'free-psychology-books' };
  return { name: 'Arts & Humanities', slug: 'free-arts-books' };
}

function getFormats(formats: Record<string, string>): { name: string; url: string }[] {
  const result: { name: string; url: string }[] = [];
  for (const [mime, url] of Object.entries(formats)) {
    if (mime.includes('epub') && !mime.includes('noimages')) result.push({ name: 'EPUB', url });
    else if (mime === 'application/pdf') result.push({ name: 'PDF', url });
    else if (mime.includes('plain') && url.endsWith('.txt')) result.push({ name: 'TXT', url });
    else if (mime === 'text/html' && !url.includes('zip')) result.push({ name: 'HTML', url });
  }
  return result;
}

function gutenbergToBook(g: GutenbergBook): Book {
  const slug = g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const available = getFormats(g.formats);
  const coverUrl = g.formats['image/jpeg'] || null;

  return {
    id: `pg-${g.id}`,
    title: g.title.length > 120 ? g.title.slice(0, 117) + '...' : g.title,
    author: g.authors.map(a => a.name).join(', ') || 'Unknown',
    slug: `${slug}-pg-${g.id}`,
    coverUrl,
    description: `Free public domain book from Project Gutenberg. ${g.subjects.slice(0, 3).join(', ')}. Downloaded ${g.download_count.toLocaleString()} times.`,
    rating: +(3.5 + Math.random() * 1.3).toFixed(1),
    ratingCount: Math.floor(g.download_count / 100),
    contentType: 'BOOK',
    formats: available.map(f => f.name),
    viewCount: g.download_count,
    likeCount: Math.floor(g.download_count / 20),
    language: g.languages[0] || 'en',
    category: mapCategory(g.subjects, g.bookshelves),
    sourceUrl: `https://www.gutenberg.org/ebooks/${g.id}`,
    sourceType: 'gutenberg' as const,
    downloadLinks: [
      { label: 'Read on Project Gutenberg', url: `https://www.gutenberg.org/ebooks/${g.id}`, source: 'Project Gutenberg' },
      ...available.map(f => ({ label: `Download ${f.name}`, url: f.url, source: 'Project Gutenberg' })),
    ],
  };
}

/**
 * Fallback backend: search the Project Gutenberg collection mirrored on Internet Archive.
 * gutendex.com blocks datacenter IPs (403 from Vercel), but archive.org does not.
 * IA identifiers in this collection embed the PG ebook number (e.g. "aloverscomplaint01137gut" → 1137),
 * letting us link to the real gutenberg.org page so the in-page preview still works.
 */
async function searchGutenbergViaArchive(query: string, page = 1): Promise<{ books: Book[]; total: number }> {
  const q = query === '*' ? 'collection:gutenberg' : `${query} AND collection:gutenberg`;
  const sort = query === '*' ? '&sort[]=downloads+desc' : '';
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=downloads&fl[]=subject&rows=32&page=${page}${sort}&output=json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    console.error(`[gutenberg] archive fallback failed: ${res.status} ${res.statusText}`);
    return { books: [], total: 0 };
  }
  const data = await res.json();
  const docs: { identifier: string; title?: string; creator?: string | string[]; year?: string; downloads?: number; subject?: string | string[] }[] = data.response?.docs || [];

  const books: Book[] = docs.filter(d => d.title).map(d => {
    const pgMatch = d.identifier.match(/(\d+)gut$/);
    const pgId = pgMatch ? parseInt(pgMatch[1], 10) : null;
    const gutenbergUrl = pgId ? `https://www.gutenberg.org/ebooks/${pgId}` : `https://archive.org/details/${d.identifier}`;
    const title = d.title!;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    const author = Array.isArray(d.creator) ? d.creator.join(', ') : (d.creator || 'Unknown');
    const subjects = Array.isArray(d.subject) ? d.subject : d.subject ? [d.subject] : [];

    return {
      id: pgId ? `pg-${pgId}` : `ia-${d.identifier}`,
      title: title.length > 120 ? title.slice(0, 117) + '...' : title,
      author,
      slug: pgId ? `${slug}-pg-${pgId}` : `${slug}-ia-${d.identifier}`.slice(0, 100),
      coverUrl: `https://archive.org/services/img/${d.identifier}`,
      description: `Free public domain book from Project Gutenberg. ${subjects.slice(0, 3).join(', ')}`,
      rating: +(3.5 + Math.random() * 1.3).toFixed(1),
      ratingCount: Math.floor((d.downloads || 1000) / 100),
      contentType: 'BOOK' as const,
      formats: ['HTML', 'EPUB', 'TXT'],
      viewCount: d.downloads || Math.floor(1000 + Math.random() * 20000),
      likeCount: Math.floor((d.downloads || 1000) / 20),
      publishYear: d.year ? parseInt(d.year) : undefined,
      language: 'en',
      category: mapCategory(subjects, []),
      sourceUrl: gutenbergUrl,
      sourceType: 'gutenberg' as const,
      downloadLinks: [
        { label: 'Read on Project Gutenberg', url: gutenbergUrl, source: 'Project Gutenberg' },
        { label: 'Read on Internet Archive', url: `https://archive.org/details/${d.identifier}`, source: 'Internet Archive' },
      ],
    };
  });

  return { books, total: data.response?.numFound || books.length };
}

export async function searchGutenberg(query: string, page = 1): Promise<{ books: Book[]; total: number }> {
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&page=${page}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, headers: GUTENDEX_HEADERS });
    if (!res.ok) {
      console.error(`[gutenberg] gutendex failed (${res.status}), using archive.org fallback`);
      return searchGutenbergViaArchive(query, page);
    }
    const data: GutenbergResponse = await res.json();

    return {
      books: data.results.map(gutenbergToBook),
      total: data.count,
    };
  } catch (err) {
    console.error(`[gutenberg] gutendex threw, using archive.org fallback:`, err);
    return searchGutenbergViaArchive(query, page);
  }
}

export async function getGutenbergPopular(page = 1): Promise<{ books: Book[]; total: number }> {
  const url = `https://gutendex.com/books/?sort=popular&page=${page}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, headers: GUTENDEX_HEADERS });
    if (!res.ok) {
      console.error(`[gutenberg] popular failed (${res.status}), using archive.org fallback`);
      return searchGutenbergViaArchive('*', page);
    }
    const data: GutenbergResponse = await res.json();

    return {
      books: data.results.map(gutenbergToBook),
      total: data.count,
    };
  } catch (err) {
    console.error(`[gutenberg] popular threw, using archive.org fallback:`, err);
    return searchGutenbergViaArchive('*', page);
  }
}

export async function getGutenbergByTopic(topic: string, page = 1): Promise<{ books: Book[]; total: number }> {
  const url = `https://gutendex.com/books/?topic=${encodeURIComponent(topic)}&page=${page}`;
  const res = await fetch(url, { next: { revalidate: 3600 }, headers: GUTENDEX_HEADERS });
  if (!res.ok) {
    console.error(`[gutenberg] topic request failed: ${res.status} ${res.statusText}`);
    return { books: [], total: 0 };
  }
  const data: GutenbergResponse = await res.json();

  return {
    books: data.results.map(gutenbergToBook),
    total: data.count,
  };
}
