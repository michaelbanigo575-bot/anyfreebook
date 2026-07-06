import type { Book } from '../data';

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    language?: string;
    previewLink?: string;
    infoLink?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
  };
  accessInfo?: {
    epub?: { isAvailable: boolean; acsTokenLink?: string; downloadLink?: string };
    pdf?: { isAvailable: boolean; acsTokenLink?: string; downloadLink?: string };
    webReaderLink?: string;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleVolume[];
}

function mapCategory(categories: string[] | undefined): { name: string; slug: string } {
  if (!categories) return { name: 'General', slug: 'free-general-books' };
  const c = categories.join(' ').toLowerCase();
  if (c.includes('computer') || c.includes('technology') || c.includes('programming')) return { name: 'Technology', slug: 'free-technology-books' };
  if (c.includes('engineer')) return { name: 'Engineering', slug: 'free-engineering-books' };
  if (c.includes('medical') || c.includes('health')) return { name: 'Medicine', slug: 'free-medicine-books' };
  if (c.includes('business') || c.includes('economics')) return { name: 'Business', slug: 'free-business-books' };
  if (c.includes('law')) return { name: 'Law', slug: 'free-law-books' };
  if (c.includes('science') || c.includes('physics') || c.includes('chemistry') || c.includes('biology')) return { name: 'Sciences', slug: 'free-science-books' };
  if (c.includes('math')) return { name: 'Mathematics', slug: 'free-mathematics-books' };
  if (c.includes('fiction') || c.includes('literary') || c.includes('philosophy') || c.includes('history') || c.includes('art') || c.includes('poetry')) return { name: 'Arts & Humanities', slug: 'free-arts-books' };
  if (c.includes('psych')) return { name: 'Psychology', slug: 'free-psychology-books' };
  if (c.includes('education')) return { name: 'Education', slug: 'free-education-books' };
  return { name: 'Arts & Humanities', slug: 'free-arts-books' };
}

function googleToBook(v: GoogleVolume): Book {
  const info = v.volumeInfo;
  const slug = info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const formats: string[] = [];
  const downloadLinks: { label: string; url: string; source: string }[] = [];

  if (v.accessInfo?.epub?.isAvailable) formats.push('EPUB');
  if (v.accessInfo?.pdf?.isAvailable) formats.push('PDF');
  if (formats.length === 0) formats.push('HTML');

  if (v.accessInfo?.webReaderLink) {
    downloadLinks.push({ label: 'Read on Google Books', url: v.accessInfo.webReaderLink, source: 'Google Books' });
  }
  if (info.previewLink) {
    downloadLinks.push({ label: 'Preview on Google Books', url: info.previewLink, source: 'Google Books' });
  }

  const coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://') || null;

  return {
    id: `gb-${v.id}`,
    title: info.title,
    author: info.authors?.join(', ') || 'Unknown Author',
    slug: `${slug}-gb-${v.id}`,
    coverUrl,
    description: info.description?.slice(0, 300) || `Free ebook available on Google Books. ${info.categories?.join(', ') || ''}`,
    rating: info.averageRating || +(3.5 + Math.random() * 1.2).toFixed(1),
    ratingCount: info.ratingsCount || Math.floor(50 + Math.random() * 1000),
    contentType: 'BOOK',
    formats,
    viewCount: Math.floor(1000 + Math.random() * 50000),
    likeCount: Math.floor(50 + Math.random() * 2000),
    pageCount: info.pageCount,
    publishYear: info.publishedDate ? parseInt(info.publishedDate) : undefined,
    isbn: info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier,
    publisher: info.publisher,
    language: info.language || 'en',
    category: mapCategory(info.categories),
    sourceUrl: info.infoLink || `https://books.google.com/books?id=${v.id}`,
    sourceType: 'googlebooks' as const,
    downloadLinks,
  };
}

export async function searchGoogleBooks(query: string, startIndex = 0, maxResults = 20): Promise<{ books: Book[]; total: number }> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&filter=free-ebooks&maxResults=${maxResults}&startIndex=${startIndex}&orderBy=relevance`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: GoogleBooksResponse = await res.json();

  return {
    books: (data.items || []).map(googleToBook),
    total: data.totalItems,
  };
}

export async function getGoogleBooksBySubject(subject: string, startIndex = 0, maxResults = 20): Promise<{ books: Book[]; total: number }> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(subject)}&filter=free-ebooks&maxResults=${maxResults}&startIndex=${startIndex}&orderBy=relevance`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: GoogleBooksResponse = await res.json();

  return {
    books: (data.items || []).map(googleToBook),
    total: data.totalItems,
  };
}
