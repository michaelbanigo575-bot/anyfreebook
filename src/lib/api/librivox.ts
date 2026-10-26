import type { Book } from '../data';
import { fetchUpstreamJson } from './http';

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

function librivoxToBook(b: LibrivoxBook): Book | null {
  if (!b.url_librivox) return null; // no real per-title page to link to — skip rather than point at the homepage
  const slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const url = b.url_librivox;

  return {
    id: `lv-${b.id}`,
    title: b.title,
    author: authorName(b.authors),
    slug: `${slug}-lv-${b.id}`.slice(0, 100),
    coverUrl: null,
    description: (b.description || `Free public-domain audiobook from LibriVox, read by volunteers.`).slice(0, 300),
    // LibriVox's API reports no ratings or play counts.
    rating: 0,
    ratingCount: 0,
    contentType: 'AUDIOBOOK',
    formats: ['MP3'],
    viewCount: 0,
    likeCount: 0,
    duration: b.totaltimesecs,
    language: (b.language || 'English').slice(0, 2).toLowerCase() === 'en' ? 'en' : (b.language || 'en'),
    category: { name: 'Arts & Humanities', slug: 'free-arts-books' },
    sourceUrl: url,
    sourceType: 'librivox' as const,
    downloadLinks: [
      { label: 'Listen on LibriVox', url, source: 'LibriVox' },
    ],
  };
}

export async function searchLibrivox(query: string, limit = 20): Promise<{ books: Book[]; total: number }> {
  const url = `https://librivox.org/api/feed/audiobooks/?title=^${encodeURIComponent(query)}&format=json&limit=${limit}`;
  // Two different things can go wrong here, and they must not look alike.
  //
  // LibriVox answers a title search that matches nothing with HTTP 404 and a
  // body of {"error":"Audiobooks could not be found"} — that is a real answer
  // ("no audiobook starts with this word"), so it counts as zero matches.
  //
  // A 5xx, a 429 or a dead socket means LibriVox did not answer at all. That is
  // thrown so the caller records the source as failed. Returning an empty list
  // for both cases would make a broken upstream look like a complete answer.
  const data = await fetchUpstreamJson<LibrivoxResponse>(
    url,
    { next: { revalidate: 3600 } },
    { source: 'LibriVox', emptyOnStatus: [404] }
  );
  if (!data) return { books: [], total: 0 };

  const books = (data.books || []).filter(b => b.title).map(librivoxToBook).filter((b): b is Book => b !== null);
  return { books, total: books.length };
}
