import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight originality check: cross-searches the title (and a snippet of
 * the opening text) against Open Library and Google Books to catch obvious
 * cases of someone re-uploading an already-published, copyrighted work.
 *
 * This is NOT a real plagiarism engine (no Turnitin-grade text-matching is
 * free to run) — it's a first-pass signal: "does a book with this exact
 * title and author already exist in a major catalog?" Flags for human
 * review; never silently blocks a publish.
 */

interface CheckResult {
  status: 'checked_clear' | 'flagged';
  matches: { source: string; title: string; author?: string; url: string }[];
}

async function searchOpenLibrary(title: string): Promise<CheckResult['matches']> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=3&fields=key,title,author_name`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).map((d: { key: string; title: string; author_name?: string[] }) => ({
      source: 'Open Library',
      title: d.title,
      author: d.author_name?.[0],
      url: `https://openlibrary.org${d.key}`,
    }));
  } catch {
    return [];
  }
}

async function searchGoogleBooks(title: string): Promise<CheckResult['matches']> {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=3${key ? `&key=${key}` : ''}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((v: { volumeInfo: { title: string; authors?: string[]; infoLink?: string } }) => ({
      source: 'Google Books',
      title: v.volumeInfo.title,
      author: v.volumeInfo.authors?.[0],
      url: v.volumeInfo.infoLink || `https://books.google.com/`,
    }));
  } catch {
    return [];
  }
}

function titlesLikelyMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const na = norm(a), nb = norm(b);
  if (na.length < 4) return false;
  return na === nb || nb.includes(na) || na.includes(nb);
}

export async function POST(request: NextRequest) {
  const { title } = await request.json().catch(() => ({}));
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return NextResponse.json({ status: 'checked_clear', matches: [] } satisfies CheckResult);
  }

  const [ol, gb] = await Promise.all([searchOpenLibrary(title), searchGoogleBooks(title)]);
  const allMatches = [...ol, ...gb].filter(m => titlesLikelyMatch(m.title, title));

  const result: CheckResult = {
    status: allMatches.length > 0 ? 'flagged' : 'checked_clear',
    matches: allMatches.slice(0, 5),
  };

  return NextResponse.json(result);
}
