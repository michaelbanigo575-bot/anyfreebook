import type { Book } from '../data';

interface ArchiveDoc {
  identifier: string;
  title: string;
  creator?: string | string[];
  year?: string;
  downloads?: number;
  subject?: string | string[];
  language?: string | string[];
}

interface ArchiveResponse {
  response: {
    numFound: number;
    docs: ArchiveDoc[];
  };
}

function mapCategory(subject: string | string[] | undefined): { name: string; slug: string } {
  const s = (Array.isArray(subject) ? subject.join(' ') : subject || '').toLowerCase();
  if (s.includes('computer') || s.includes('programming') || s.includes('software')) return { name: 'Technology', slug: 'free-technology-books' };
  if (s.includes('engineer')) return { name: 'Engineering', slug: 'free-engineering-books' };
  if (s.includes('medic') || s.includes('health') || s.includes('anatomy')) return { name: 'Medicine', slug: 'free-medicine-books' };
  if (s.includes('business') || s.includes('economic')) return { name: 'Business', slug: 'free-business-books' };
  if (s.includes('law')) return { name: 'Law', slug: 'free-law-books' };
  if (s.includes('physics') || s.includes('chemistry') || s.includes('biology') || s.includes('science')) return { name: 'Sciences', slug: 'free-science-books' };
  if (s.includes('math')) return { name: 'Mathematics', slug: 'free-mathematics-books' };
  if (s.includes('psych')) return { name: 'Psychology', slug: 'free-psychology-books' };
  if (s.includes('religio') || s.includes('spiritual') || s.includes('theolog') || s.includes('bible') || s.includes('quran') || s.includes('scripture')) return { name: 'Spiritual & Religious', slug: 'free-spiritual-religious-books' };
  if (s.includes('motivat') || s.includes('inspirat') || s.includes('self-help') || s.includes('self help') || s.includes('personal growth')) return { name: 'Inspirational & Motivational', slug: 'free-inspirational-motivational-books' };
  if (s.includes('politic') && (s.includes('magazine') || s.includes('periodical'))) return { name: 'Political Magazines', slug: 'free-political-magazines' };
  return { name: 'Arts & Humanities', slug: 'free-arts-books' };
}

function docToBook(doc: ArchiveDoc): Book {
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const creator = Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Unknown Author');
  const detailUrl = `https://archive.org/details/${doc.identifier}`;

  return {
    id: `ia-${doc.identifier}`,
    title: doc.title,
    author: creator,
    slug: `${slug}-ia-${doc.identifier}`.slice(0, 100),
    coverUrl: `https://archive.org/services/img/${doc.identifier}`,
    description: `Free to read/borrow on the Internet Archive. ${doc.year ? `Published ${doc.year}.` : ''} ${doc.downloads ? `${doc.downloads.toLocaleString()} downloads.` : ''}`,
    rating: +(3.5 + Math.random() * 1.2).toFixed(1),
    ratingCount: Math.floor(50 + Math.random() * 2000),
    contentType: 'BOOK',
    formats: ['PDF', 'EPUB', 'TXT'],
    viewCount: doc.downloads || Math.floor(1000 + Math.random() * 20000),
    likeCount: Math.floor((doc.downloads || 1000) / 20),
    publishYear: doc.year ? parseInt(doc.year) : undefined,
    language: (Array.isArray(doc.language) ? doc.language[0] : doc.language) || 'en',
    category: mapCategory(doc.subject),
    sourceUrl: detailUrl,
    sourceType: 'archive' as const,
    downloadLinks: [
      { label: 'Read on Internet Archive', url: detailUrl, source: 'Internet Archive' },
    ],
  };
}

function audioDocToBook(doc: ArchiveDoc): Book {
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const creator = Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Unknown Narrator');
  const detailUrl = `https://archive.org/details/${doc.identifier}`;

  return {
    id: `ia-audio-${doc.identifier}`,
    title: doc.title,
    author: creator,
    slug: `${slug}-ia-audio-${doc.identifier}`.slice(0, 100),
    coverUrl: `https://archive.org/services/img/${doc.identifier}`,
    description: `Free audio from the Internet Archive. ${doc.year ? `Published ${doc.year}.` : ''} ${doc.downloads ? `${doc.downloads.toLocaleString()} plays.` : ''}`,
    rating: +(3.6 + Math.random() * 1.2).toFixed(1),
    ratingCount: Math.floor(50 + Math.random() * 1500),
    contentType: 'AUDIOBOOK',
    formats: ['MP3'],
    viewCount: doc.downloads || Math.floor(500 + Math.random() * 15000),
    likeCount: Math.floor((doc.downloads || 500) / 15),
    publishYear: doc.year ? parseInt(doc.year) : undefined,
    language: (Array.isArray(doc.language) ? doc.language[0] : doc.language) || 'en',
    category: mapCategory(doc.subject),
    sourceUrl: detailUrl,
    sourceType: 'archive' as const,
    downloadLinks: [
      { label: 'Listen on Internet Archive', url: detailUrl, source: 'Internet Archive' },
    ],
  };
}

/** Podcasts and spoken-word audio (mediatype:audio) — separate from the texts search above. */
export async function searchArchiveAudio(query: string, page = 1, rows = 20): Promise<{ books: Book[]; total: number }> {
  const q = `${query} AND mediatype:audio`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=downloads&fl[]=subject&fl[]=language&rows=${rows}&page=${page}&output=json`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: ArchiveResponse = await res.json();

  return {
    books: data.response.docs.filter(d => d.title).map(audioDocToBook),
    total: data.response.numFound,
  };
}

export async function searchArchive(query: string, page = 1, rows = 20): Promise<{ books: Book[]; total: number }> {
  const q = `${query} AND mediatype:texts`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=downloads&fl[]=subject&fl[]=language&rows=${rows}&page=${page}&output=json`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { books: [], total: 0 };
  const data: ArchiveResponse = await res.json();

  return {
    books: data.response.docs.filter(d => d.title).map(docToBook),
    total: data.response.numFound,
  };
}
