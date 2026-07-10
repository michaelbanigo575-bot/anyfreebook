import type { Book } from '../data';

interface DoajLink {
  url: string;
  type?: string;
}

interface DoajArticle {
  id: string;
  bibjson: {
    title: string;
    author?: { name: string }[];
    year?: string;
    journal?: { title?: string };
    link?: DoajLink[];
    subject?: { term: string }[];
  };
}

interface DoajResponse {
  total: number;
  results: DoajArticle[];
}

function mapCategory(subjects: { term: string }[] | undefined): { name: string; slug: string } {
  const s = (subjects?.map(x => x.term).join(' ') || '').toLowerCase();
  if (s.includes('computer') || s.includes('technology')) return { name: 'Technology', slug: 'free-technology-books' };
  if (s.includes('medic') || s.includes('health')) return { name: 'Medicine', slug: 'free-medicine-books' };
  if (s.includes('business') || s.includes('economic')) return { name: 'Business', slug: 'free-business-books' };
  if (s.includes('law')) return { name: 'Law', slug: 'free-law-books' };
  if (s.includes('physics') || s.includes('chemistry') || s.includes('biology') || s.includes('science')) return { name: 'Sciences', slug: 'free-science-books' };
  if (s.includes('math')) return { name: 'Mathematics', slug: 'free-mathematics-books' };
  if (s.includes('psycholog')) return { name: 'Psychology', slug: 'free-psychology-books' };
  if (s.includes('education')) return { name: 'Education', slug: 'free-education-books' };
  if (s.includes('religio') || s.includes('spiritual') || s.includes('theolog')) return { name: 'Spiritual & Religious', slug: 'free-spiritual-religious-books' };
  if (s.includes('politic')) return { name: 'Political Magazines', slug: 'free-political-magazines' };
  return { name: 'Arts & Humanities', slug: 'free-arts-books' };
}

function articleToBook(article: DoajArticle): Book | null {
  const { bibjson } = article;
  if (!bibjson?.title) return null;

  const fulltextLink = bibjson.link?.find(l => l.type === 'fulltext') || bibjson.link?.[0];
  const url = fulltextLink?.url || `https://doaj.org/article/${article.id}`;
  const slug = bibjson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const year = bibjson.year ? parseInt(bibjson.year) : undefined;

  return {
    id: `doaj-${article.id}`,
    title: bibjson.title,
    author: bibjson.author?.map(a => a.name).join(', ') || 'Unknown Author',
    slug: `${slug}-doaj-${article.id}`.slice(0, 100),
    coverUrl: null,
    description: `Free open-access article${bibjson.journal?.title ? ` from ${bibjson.journal.title}` : ''} via DOAJ (Directory of Open Access Journals). ${year ? `Published ${year}.` : ''}`,
    rating: +(3.7 + Math.random() * 1.1).toFixed(1),
    ratingCount: Math.floor(10 + Math.random() * 300),
    contentType: 'BOOK',
    formats: ['HTML', 'PDF'],
    viewCount: Math.floor(200 + Math.random() * 8000),
    likeCount: Math.floor(10 + Math.random() * 300),
    publishYear: year && !isNaN(year) ? year : undefined,
    language: 'en',
    category: mapCategory(bibjson.subject),
    sourceUrl: url,
    sourceType: 'doaj' as const,
    downloadLinks: [
      { label: 'Read on DOAJ', url, source: 'DOAJ' },
    ],
  };
}

export async function searchDOAJ(query: string, page = 1, pageSize = 20): Promise<{ books: Book[]; total: number }> {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(query)}?page=${page}&pageSize=${pageSize}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: DoajResponse = await res.json();

  const books = (data.results || [])
    .map(articleToBook)
    .filter((b): b is Book => b !== null);

  return { books, total: data.total || books.length };
}
