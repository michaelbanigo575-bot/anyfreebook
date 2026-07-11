import { NextRequest, NextResponse } from 'next/server';

/**
 * Originality check, two layers:
 *
 * 1. TITLE layer — cross-searches the title against Open Library and Google
 *    Books with token-set similarity (catches reordered/partial titles, not
 *    just exact matches). A hit => 'flagged' (author must confirm rights).
 *
 * 2. TEXT layer — samples distinctive sentences from the manuscript body and
 *    runs them as quoted phrase searches against Google Books' full-text
 *    index. A verbatim hit in a published book => severity 'text', the
 *    strongest signal we can get for free. The publish form blocks these
 *    unless the work is declared as a licensed publication AND rights are
 *    explicitly confirmed.
 *
 * Still not Turnitin — but a title match, reordered-title match, or verbatim
 * paragraph lifted from a published book will all get caught.
 */

interface Match { source: string; title: string; author?: string; url: string; via: 'title' | 'text' }

interface CheckResult {
  status: 'checked_clear' | 'flagged';
  severity: 'none' | 'title' | 'text';
  matches: Match[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Token-set similarity: catches "The Great Gatsby" vs "Great Gatsby, The" and partial overlaps. */
function titleSimilarity(a: string, b: string): number {
  const ta = new Set(norm(a).split(' ').filter(w => w.length > 2));
  const tb = new Set(norm(b).split(' ').filter(w => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  ta.forEach(w => { if (tb.has(w)) common++; });
  return common / Math.min(ta.size, tb.size);
}

async function searchOpenLibrary(title: string): Promise<Match[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=5&fields=key,title,author_name`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).map((d: { key: string; title: string; author_name?: string[] }) => ({
      source: 'Open Library', title: d.title, author: d.author_name?.[0],
      url: `https://openlibrary.org${d.key}`, via: 'title' as const,
    }));
  } catch { return []; }
}

async function searchGoogleBooks(q: string, via: 'title' | 'text'): Promise<Match[]> {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5${key ? `&key=${key}` : ''}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((v: { volumeInfo: { title: string; authors?: string[]; infoLink?: string } }) => ({
      source: 'Google Books', title: v.volumeInfo.title, author: v.volumeInfo.authors?.[0],
      url: v.volumeInfo.infoLink || 'https://books.google.com/', via,
    }));
  } catch { return []; }
}

/** Pick distinctive sentences from the body — long, wordy, no URLs/numbers-heavy lines. */
function samplePhrases(body: string, count = 3): string[] {
  const sentences = body
    .replace(/[#*_>`\[\]()]/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => {
      const words = s.split(' ');
      return words.length >= 10 && words.length <= 30 && !/https?:\/\//.test(s) && (s.match(/\d/g) || []).length < 6;
    });
  if (sentences.length === 0) return [];
  // Spread samples across the document: start, middle, end
  const picks: string[] = [];
  const idxs = [0, Math.floor(sentences.length / 2), sentences.length - 1];
  for (const i of idxs) {
    const s = sentences[i];
    if (s && !picks.includes(s)) picks.push(s);
    if (picks.length >= count) break;
  }
  return picks;
}

export async function POST(request: NextRequest) {
  const { title, body } = await request.json().catch(() => ({}));
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return NextResponse.json({ status: 'checked_clear', severity: 'none', matches: [] } satisfies CheckResult);
  }

  // Layer 1: title similarity across both catalogs
  const [ol, gb] = await Promise.all([
    searchOpenLibrary(title),
    searchGoogleBooks(`intitle:${title}`, 'title'),
  ]);
  const titleMatches = [...ol, ...gb].filter(m => titleSimilarity(m.title, title) >= 0.75);

  // Layer 2: verbatim phrase search in Google Books full text
  let textMatches: Match[] = [];
  if (typeof body === 'string' && body.length > 300) {
    const phrases = samplePhrases(body);
    const results = await Promise.all(phrases.map(p => searchGoogleBooks(`"${p}"`, 'text')));
    textMatches = results.flat();
  }

  const seen = new Set<string>();
  const allMatches = [...textMatches, ...titleMatches].filter(m => {
    const k = `${m.source}|${norm(m.title)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const severity: CheckResult['severity'] = textMatches.length > 0 ? 'text' : titleMatches.length > 0 ? 'title' : 'none';
  const result: CheckResult = {
    status: severity === 'none' ? 'checked_clear' : 'flagged',
    severity,
    matches: allMatches.slice(0, 6),
  };

  return NextResponse.json(result);
}
