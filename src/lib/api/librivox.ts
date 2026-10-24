import type { Book } from '../data';
import { UPSTREAM_TIMEOUT } from './http';

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
  // Failures are thrown, not swallowed. A caller that reports `partial` needs to
  // be able to tell "LibriVox has no matches for this query" apart from "LibriVox
  // did not answer" — returning an empty list for both would make a broken
  // upstream look like a complete answer.
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: UPSTREAM_TIMEOUT() });
  if (!res.ok) {
    console.error(`[librivox] request failed: ${res.status} ${res.statusText}`);
    throw new Error(`librivox: upstream responded ${res.status}`);
  }
  const data: LibrivoxResponse = await res.json();
  const books = (data.books || []).filter(b => b.title).map(librivoxToBook).filter((b): b is Book => b !== null);
  return { books, total: books.length };
}
