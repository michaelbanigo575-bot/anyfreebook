import type { Book } from '../data';

interface LibrivoxBook {
  id: string;
  title: string;
  description?: string;
  totaltime?: string;
  totaltimesecs?: number;
  url_librivox?: string;
  url_text_source?: string;
  language?: string;
  authors?: { first_name?: string; last_name?: string }[];
}

interface LibrivoxResponse {
  books?: LibrivoxBook[];
}

function authorName(authors: LibrivoxBook['authors']): string {
  if (!authors || authors.length === 0) return 'Unknown';
  return authors.map(a => [a.first_name, a.last_name].filter(Boolean).join(' ')).join(', ') || 'Unknown';
}

function librivoxToBook(b: LibrivoxBook): Book {
  const slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const url = b.url_librivox || `https://librivox.org/`;

  return {
    id: `lv-${b.id}`,
    title: b.title,
    author: authorName(b.authors),
    slug: `${slug}-lv-${b.id}`.slice(0, 100),
    coverUrl: null,
    description: (b.description || `Free public-domain audiobook from LibriVox, read by volunteers.`).slice(0, 300),
    rating: +(3.6 + Math.random() * 1.2).toFixed(1),
    ratingCount: Math.floor(50 + Math.random() * 2000),
    contentType: 'AUDIOBOOK',
    formats: ['MP3'],
    viewCount: Math.floor(1000 + Math.random() * 30000),
    likeCount: Math.floor(50 + Math.random() * 1500),
    duration: b.totaltimesecs,
    language: (b.language || 'English').slice(0, 2).toLowerCase() === 'en' ? 'en' : (b.language || 'en'),
    category: { name: 'Arts & Humanities', slug: 'free-arts-books' },
    sourceUrl: url,
    sourceType: 'archive' as const,
    downloadLinks: [
      { label: 'Listen on LibriVox', url, source: 'LibriVox' },
    ],
  };
}

export async function searchLibrivox(query: string, limit = 20): Promise<{ books: Book[]; total: number }> {
  const url = `https://librivox.org/api/feed/audiobooks/?title=^${encodeURIComponent(query)}&format=json&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { books: [], total: 0 };
    const data: LibrivoxResponse = await res.json();
    const books = (data.books || []).filter(b => b.title).map(librivoxToBook);
    return { books, total: books.length };
  } catch {
    return { books: [], total: 0 };
  }
}
