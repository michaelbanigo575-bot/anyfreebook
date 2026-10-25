import { UPSTREAM_TIMEOUT } from './http';
import type { Book } from '../data';

/**
 * Wikisource — public-domain texts, in every language that has an edition.
 *
 * Why it is here: it is the source that answers "is there a free copy of this
 * in Chinese, Japanese, Arabic, Hebrew?" Wikisource only hosts texts that are
 * out of copyright in the country of publication, so everything on it is
 * freely redistributable, and the Wikimedia REST API renders each page to a
 * real PDF.
 *
 * Each language is a separate wiki with its own API, so the language list is
 * a parameter rather than a constant: searching all of them at once would
 * mean thirty requests per search. The English edition is the default and
 * the site asks for more only when the reader is looking at a language.
 */

export interface WikisourceLanguage {
  code: string;
  label: string;
}

/**
 * The editions worth asking by default. Deliberately short: every language is
 * another HTTP request, and the site's language category pages ask for their
 * own.
 */
export const DEFAULT_WIKISOURCE_LANGUAGES: WikisourceLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'he', label: 'Hebrew' },
  { code: 'fr', label: 'French' },
];

/** Wikisource editions that exist and carry public-domain texts. */
export const WIKISOURCE_LANGUAGES: WikisourceLanguage[] = [
  ...DEFAULT_WIKISOURCE_LANGUAGES,
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
  { code: 'el', label: 'Greek' },
  { code: 'pl', label: 'Polish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' },
  { code: 'th', label: 'Thai' },
  { code: 'hi', label: 'Hindi' },
  { code: 'fa', label: 'Persian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'cs', label: 'Czech' },
  { code: 'fi', label: 'Finnish' },
  { code: 'da', label: 'Danish' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'ro', label: 'Romanian' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'ko', label: 'Korean' },
];

interface WikisourceSearchResponse {
  query?: {
    searchinfo?: { totalhits?: number };
    search?: { title: string; pageid?: number }[];
  };
}

/** The rendered PDF of a Wikisource page — a real, freely downloadable file. */
export function wikisourcePdfUrl(lang: string, title: string): string {
  return `https://${lang}.wikisource.org/api/rest_v1/page/pdf/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/** The page itself, which is the readable full text. */
export function wikisourcePageUrl(lang: string, title: string): string {
  return `https://${lang}.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function pageToBook(
  lang: WikisourceLanguage,
  title: string,
  pageid: number | undefined
): Book {
  const id = `${lang.code}-${pageid ?? title.length}`;
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)}-wikisource-${lang.code}`.slice(0, 100);
  const pdf = wikisourcePdfUrl(lang.code, title);

  return {
    id: `wikisource-${id}`,
    title,
    // Wikisource's search API does not carry authorship on the search result.
    // Saying "Unknown Author" is honest; guessing from the title is not.
    author: 'Unknown Author',
    slug,
    coverUrl: null,
    description:
      `A public-domain text from the ${lang.label} Wikisource edition. ` +
      'Wikisource only hosts works whose copyright has expired, and every page can be rendered to a PDF.',
    rating: 0,
    ratingCount: 0,
    contentType: 'BOOK',
    formats: ['PDF', 'HTML'],
    viewCount: 0,
    likeCount: 0,
    publishYear: undefined,
    language: lang.code,
    category: { name: 'Arts & Humanities', slug: 'free-arts-books' },
    sourceUrl: wikisourcePageUrl(lang.code, title),
    sourceType: 'wikisource' as const,
    downloadLinks: [
      { label: 'PDF', url: pdf, source: `Wikisource (${lang.label})` },
      { label: 'Read on Wikisource', url: wikisourcePageUrl(lang.code, title), source: `Wikisource (${lang.label})` },
    ],
  };
}

/** Lowercase, alphanumeric-only, single-spaced. */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * True when a page title is the title that was asked for.
 *
 * The search matches titles *and* page text, so "alice in wonderland" also
 * finds "Alice in Wonderland (1903 film)" — a different work, whose PDF is a
 * film script rather than the novel. A wrong work is worse than no result,
 * so only the exact title, or that title followed by a subtitle, is kept.
 */
function titleMatches(query: string, title: string): boolean {
  const want = normalise(query);
  const got = normalise(title);
  if (!want || !got) return false;
  if (got === want) return true;

  const rawWant = query.trim().toLowerCase();
  const rawGot = title.trim().toLowerCase();
  // Only a colon or a dash introduces a subtitle. A parenthetical does not:
  // "Alice in Wonderland (1903 film)" is a film script and "Alice in
  // Wonderland (Berlin)" is a city edition, and neither is the novel the
  // reader asked for.
  const separator = /^[:\-–—]/;
  if (rawGot.startsWith(rawWant) && separator.test(rawGot.slice(rawWant.length).trimStart())) {
    return true;
  }
  return false;
}

/**
 * Which Wikisource edition, and which native-language term, serves each
 * language category.
 *
 * The category pages already carry a native-language query, but it is mixed
 * with English ("中文书 chinese books"), and an English edition has no Chinese
 * text to match. These are the terms that actually find literature inside
 * each edition.
 *
 * Seven of the thirty-four language categories have no Wikisource edition —
 * Yoruba, Igbo, Hausa and Amharic return 404, and Swahili, Zulu and
 * Afrikaans serve an HTML page rather than the API. Those categories keep the
 * three general sources and do not pretend otherwise.
 */
export const WIKISOURCE_CATEGORY_LANGUAGES: Record<string, { code: string; query: string }> = {
  'Books in French': { code: 'fr', query: 'littérature' },
  'Books in Spanish': { code: 'es', query: 'literatura' },
  'Books in Portuguese': { code: 'pt', query: 'literatura' },
  'Books in Arabic': { code: 'ar', query: 'أدب' },
  'Books in Hindi': { code: 'hi', query: 'साहित्य' },
  'Books in Urdu': { code: 'ur', query: 'ادب' },
  'Books in Bengali': { code: 'bn', query: 'সাহিত্য' },
  'Books in Tamil': { code: 'ta', query: 'இலக்கியம்' },
  'Books in Chinese': { code: 'zh', query: '文学' },
  'Books in Japanese': { code: 'ja', query: '文学' },
  'Books in Korean': { code: 'ko', query: '문학' },
  'Books in German': { code: 'de', query: 'literatur' },
  'Books in Russian': { code: 'ru', query: 'литература' },
  'Books in Italian': { code: 'it', query: 'letteratura' },
  'Books in Dutch': { code: 'nl', query: 'literatuur' },
  'Books in Greek': { code: 'el', query: 'λογοτεχνία' },
  'Books in Turkish': { code: 'tr', query: 'edebiyat' },
  'Books in Persian': { code: 'fa', query: 'ادبیات' },
  'Books in Hebrew': { code: 'he', query: 'ספרות' },
  'Books in Polish': { code: 'pl', query: 'literatura' },
  'Books in Ukrainian': { code: 'uk', query: 'література' },
  'Books in Vietnamese': { code: 'vi', query: 'văn học' },
  'Books in Indonesian': { code: 'id', query: 'sastra' },
  'Books in Latin': { code: 'la', query: 'libri' },
  'Books in Esperanto': { code: 'eo', query: 'libroj' },
};

/** Search one Wikisource language edition. */
export async function searchWikisourceLanguage(
  query: string,
  lang: WikisourceLanguage,
  page = 1,
  pageSize = 20,
  options: { exactTitleOnly?: boolean } = {}
): Promise<{ books: Book[]; total: number }> {
  const exactTitleOnly = options.exactTitleOnly !== false;
  const url =
    `https://${lang.code}.wikisource.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=${pageSize}` +
    `&sroffset=${(Math.max(1, page) - 1) * pageSize}&srnamespace=0&format=json`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { 'User-Agent': 'anyfreebook/1.0 (https://anyfreebook.com)' },
    signal: UPSTREAM_TIMEOUT(),
  });
  if (!res.ok) return { books: [], total: 0 };

  const data: WikisourceSearchResponse = await res.json();
  const all = data.query?.search || [];
  const hits = exactTitleOnly ? all.filter(hit => titleMatches(query, hit.title)) : all;
  const books = hits.map(hit => pageToBook(lang, hit.title, hit.pageid));
  // The search matches page text as well as titles, so the raw hit count is
  // mostly noise — "python" matches a thousand pages that merely mention it.
  // The total is the number of pages that are actually this title.
  return { books, total: books.length };
}

/**
 * Search several Wikisource editions at once.
 *
 * Each edition is a separate wiki and a separate request, so this is bounded
 * on purpose: the caller decides which languages are worth asking.
 */
export async function searchWikisource(
  query: string,
  page = 1,
  pageSize = 20,
  languages: WikisourceLanguage[] = DEFAULT_WIKISOURCE_LANGUAGES
): Promise<{ books: Book[]; total: number; failedLanguages: string[] }> {
  const results = await Promise.allSettled(
    languages.map(lang => searchWikisourceLanguage(query, lang, page, pageSize))
  );

  const books: Book[] = [];
  const failedLanguages: string[] = [];
  let total = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      books.push(...result.value.books);
      total += result.value.total;
    } else {
      failedLanguages.push(languages[index].label);
    }
  });

  return { books, total, failedLanguages };
}
