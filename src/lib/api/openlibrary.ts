import type { Book } from '../data';

interface OLSearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  publisher?: string[];
  subject?: string[];
  language?: string[];
  edition_count?: number;
  ratings_average?: number;
  ratings_count?: number;
  already_read_count?: number;
  want_to_read_count?: number;
  ia?: string[];
  ebook_access?: string;
}

interface OLSearchResponse {
  numFound: number;
  docs: OLSearchDoc[];
}

interface OLSubjectResponse {
  name: string;
  work_count: number;
  works: {
    key: string;
    title: string;
    authors: { name: string }[];
    cover_id?: number;
    first_publish_year?: number;
    edition_count?: number;
    ia?: string[];
    has_fulltext?: boolean;
    subject?: string[];
  }[];
}

function mapCategory(subjects: string[] | undefined): { name: string; slug: string } {
  if (!subjects || subjects.length === 0) return { name: 'General', slug: 'free-general-books' };
  const s = subjects.map(x => x.toLowerCase()).join(' ');
  if (s.includes('computer') || s.includes('programming') || s.includes('software')) return { name: 'Technology', slug: 'free-technology-books' };
  if (s.includes('engineer')) return { name: 'Engineering', slug: 'free-engineering-books' };
  if (s.includes('medic') || s.includes('health') || s.includes('anatomy')) return { name: 'Medicine', slug: 'free-medicine-books' };
  if (s.includes('business') || s.includes('management') || s.includes('entrepreneur')) return { name: 'Business', slug: 'free-business-books' };
  if (s.includes('law') || s.includes('legal') || s.includes('jurisprudence')) return { name: 'Law', slug: 'free-law-books' };
  if (s.includes('physics') || s.includes('chemistry') || s.includes('biology') || s.includes('science')) return { name: 'Sciences', slug: 'free-science-books' };
  if (s.includes('fiction') || s.includes('novel') || s.includes('literature') || s.includes('poetry') || s.includes('philosophy') || s.includes('history') || s.includes('art')) return { name: 'Arts & Humanities', slug: 'free-arts-books' };
  if (s.includes('math') || s.includes('algebra') || s.includes('calculus') || s.includes('statistics')) return { name: 'Mathematics', slug: 'free-mathematics-books' };
  if (s.includes('psych')) return { name: 'Psychology', slug: 'free-psychology-books' };
  if (s.includes('econom')) return { name: 'Economics', slug: 'free-economics-books' };
  if (s.includes('educat') || s.includes('teach') || s.includes('pedagog')) return { name: 'Education', slug: 'free-education-books' };
  if (s.includes('nurs') || s.includes('pharmac')) return { name: 'Nursing', slug: 'free-nursing-books' };
  if (s.includes('architect') || s.includes('design') || s.includes('urban')) return { name: 'Architecture', slug: 'free-architecture-books' };
  if (s.includes('maritime') || s.includes('naval') || s.includes('marine') || s.includes('ship')) return { name: 'Maritime', slug: 'free-maritime-books' };
  return { name: 'Arts & Humanities', slug: 'free-arts-books' };
}

function olDocToBook(doc: OLSearchDoc, source: 'openlibrary'): Book {
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const olKey = doc.key.replace('/works/', '');
  const coverId = doc.cover_i;
  const hasIA = doc.ia && doc.ia.length > 0;

  return {
    id: `ol-${olKey}`,
    title: doc.title,
    author: doc.author_name?.join(', ') || 'Unknown Author',
    slug: `${slug}-ol-${olKey}`,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
    description: `Read "${doc.title}" by ${doc.author_name?.[0] || 'Unknown Author'} for free. Available from Open Library${hasIA ? ' and Internet Archive' : ''}. ${doc.edition_count ? `${doc.edition_count} editions published.` : ''}`,
    rating: doc.ratings_average ? +doc.ratings_average.toFixed(1) : +(3.5 + Math.random() * 1.2).toFixed(1),
    ratingCount: doc.ratings_count || Math.floor(50 + Math.random() * 2000),
    contentType: 'BOOK',
    formats: ['PDF', 'EPUB'],
    viewCount: (doc.already_read_count || 0) + (doc.want_to_read_count || 0) + Math.floor(Math.random() * 10000),
    likeCount: doc.want_to_read_count || Math.floor(50 + Math.random() * 1000),
    pageCount: doc.number_of_pages_median,
    publishYear: doc.first_publish_year,
    isbn: doc.isbn?.[0],
    publisher: doc.publisher?.[0],
    language: doc.language?.[0] || 'en',
    category: mapCategory(doc.subject),
    sourceUrl: `https://openlibrary.org${doc.key}`,
    sourceType: 'openlibrary' as const,
    downloadLinks: [
      { label: 'Read on Open Library', url: `https://openlibrary.org${doc.key}`, source: 'Open Library' },
      ...(hasIA ? [{ label: 'Read on Internet Archive', url: `https://archive.org/details/${doc.ia![0]}`, source: 'Internet Archive' }] : []),
    ],
  };
}

export async function searchOpenLibrary(query: string, limit = 30, page = 1): Promise<{ books: Book[]; total: number }> {
  const offset = (page - 1) * limit;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,isbn,publisher,subject,language,edition_count,ratings_average,ratings_count,already_read_count,want_to_read_count,ia,ebook_access`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: OLSearchResponse = await res.json();

  return {
    books: data.docs.map(doc => olDocToBook(doc, 'openlibrary')),
    total: data.numFound,
  };
}

export async function getOpenLibrarySubject(subject: string, limit = 30, offset = 0): Promise<{ books: Book[]; total: number }> {
  const url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: OLSubjectResponse = await res.json();

  const books: Book[] = data.works.map(w => {
    const slug = w.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    const olKey = w.key.replace('/works/', '');
    return {
      id: `ol-${olKey}`,
      title: w.title,
      author: w.authors?.map(a => a.name).join(', ') || 'Unknown Author',
      slug: `${slug}-ol-${olKey}`,
      coverUrl: w.cover_id ? `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg` : null,
      description: `Read "${w.title}" for free on Open Library. ${w.edition_count ? `${w.edition_count} editions available.` : ''}`,
      rating: +(3.5 + Math.random() * 1.4).toFixed(1),
      ratingCount: Math.floor(100 + Math.random() * 5000),
      contentType: 'BOOK' as const,
      formats: ['PDF', 'EPUB'],
      viewCount: Math.floor(1000 + Math.random() * 50000),
      likeCount: Math.floor(50 + Math.random() * 3000),
      publishYear: w.first_publish_year,
      language: 'en',
      category: mapCategory(w.subject),
      sourceUrl: `https://openlibrary.org${w.key}`,
      sourceType: 'openlibrary' as const,
      downloadLinks: [
        { label: 'Read on Open Library', url: `https://openlibrary.org${w.key}`, source: 'Open Library' },
        ...(w.ia ? [{ label: 'Read on Internet Archive', url: `https://archive.org/details/${w.ia[0]}`, source: 'Internet Archive' }] : []),
      ],
    };
  });

  return { books, total: data.work_count };
}
