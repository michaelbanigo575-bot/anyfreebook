import { fetchUpstreamJson } from './http';
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
    // PubMed returns no ratings or engagement metrics for an article record.
    rating: 0,
    ratingCount: 0,
    contentType: 'BOOK',
    formats: ['HTML', 'PDF'],
    viewCount: 0,
    likeCount: 0,
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

  // esearch answers "no papers match" with HTTP 200 and an empty id list, so
  // that case is a real zero and stays below. An error status means NCBI did
  // not answer and is thrown, so a broken upstream is never reported as "there
  // are no open-access papers about this".
  const searchData = await fetchUpstreamJson<ESearchResponse>(
    searchUrl,
    { next: { revalidate: 3600 } },
    { source: 'PubMed Central' }
  );
  if (!searchData) return { books: [], total: 0 };

  const ids = searchData.esearchresult.idlist;
  if (!ids || ids.length === 0) return { books: [], total: 0 };

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${ids.join(',')}&retmode=json`;
  const summaryData = await fetchUpstreamJson<ESummaryResponse>(
    summaryUrl,
    { next: { revalidate: 3600 } },
    { source: 'PubMed Central' }
  );
  if (!summaryData) return { books: [], total: 0 };

  const books = summaryData.result.uids
    .map(uid => summaryData.result[uid])
    .filter(item => item && item.title)
    .map(summaryToBook);

  return { books, total: parseInt(searchData.esearchresult.count) || books.length };
}
