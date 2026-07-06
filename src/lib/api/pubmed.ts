import type { Book } from '../data';

interface ESearchResponse {
  esearchresult: { idlist: string[]; count: string };
}

interface ESummaryResult {
  uid: string;
  title: string;
  authors?: { name: string }[];
  pubdate?: string;
  fulljournalname?: string;
  source?: string;
}

interface ESummaryResponse {
  result: { uids: string[]; [key: string]: any };
}

function summaryToBook(item: ESummaryResult): Book {
  const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
  const year = item.pubdate ? parseInt(item.pubdate) : undefined;
  const authors = item.authors?.map(a => a.name).join(', ') || 'Unknown Author';
  const url = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${item.uid}/`;

  return {
    id: `pmc-${item.uid}`,
    title: item.title,
    author: authors,
    slug: `${slug}-pmc-${item.uid}`.slice(0, 100),
    coverUrl: null,
    description: `Free open-access research article from PubMed Central${item.fulljournalname ? ` — ${item.fulljournalname}` : ''}. ${year ? `Published ${year}.` : ''}`,
    rating: +(3.8 + Math.random() * 1.0).toFixed(1),
    ratingCount: Math.floor(20 + Math.random() * 500),
    contentType: 'BOOK',
    formats: ['HTML', 'PDF'],
    viewCount: Math.floor(500 + Math.random() * 10000),
    likeCount: Math.floor(20 + Math.random() * 500),
    publishYear: year && !isNaN(year) ? year : undefined,
    language: 'en',
    category: { name: 'Medicine', slug: 'free-medicine-books' },
    sourceUrl: url,
    sourceType: 'pubmed' as const,
    downloadLinks: [
      { label: 'Read on PubMed Central', url, source: 'PubMed Central' },
    ],
  };
}

export async function searchPubMed(query: string, retstart = 0, retmax = 20): Promise<{ books: Book[]; total: number }> {
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}+AND+open+access[filter]&retstart=${retstart}&retmax=${retmax}&retmode=json`;

  const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
  if (!searchRes.ok) return { books: [], total: 0 };
  const searchData: ESearchResponse = await searchRes.json();
  const ids = searchData.esearchresult.idlist;
  if (!ids || ids.length === 0) return { books: [], total: 0 };

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${ids.join(',')}&retmode=json`;
  const summaryRes = await fetch(summaryUrl, { next: { revalidate: 3600 } });
  if (!summaryRes.ok) return { books: [], total: 0 };
  const summaryData: ESummaryResponse = await summaryRes.json();

  const books = summaryData.result.uids
    .map(uid => summaryData.result[uid])
    .filter(item => item && item.title)
    .map(summaryToBook);

  return { books, total: parseInt(searchData.esearchresult.count) || books.length };
}
