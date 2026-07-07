import { searchOpenLibrary } from '@/lib/api/openlibrary';
import { searchGutenberg } from '@/lib/api/gutenberg';
import { searchGoogleBooks } from '@/lib/api/googlebooks';
import { searchArchive } from '@/lib/api/archive';
import { searchPubMed } from '@/lib/api/pubmed';
import { searchDOAJ } from '@/lib/api/doaj';

export type SourceStatus = 'ok' | 'degraded' | 'down';

export interface SourceHealth {
  id: string;
  name: string;
  status: SourceStatus;
  latencyMs: number;
  resultCount: number;
  totalReported: number;
  error?: string;
}

const PROBES: Array<{ id: string; name: string; fn: () => Promise<{ books: unknown[]; total: number }> }> = [
  { id: 'openlibrary', name: 'Open Library', fn: () => searchOpenLibrary('test', 3, 1) },
  { id: 'gutenberg', name: 'Project Gutenberg', fn: () => searchGutenberg('test', 1) },
  { id: 'googlebooks', name: 'Google Books', fn: () => searchGoogleBooks('test', 0, 3) },
  { id: 'archive', name: 'Internet Archive', fn: () => searchArchive('test', 1, 3) },
  { id: 'pubmed', name: 'PubMed Central', fn: () => searchPubMed('test', 0, 3) },
  { id: 'doaj', name: 'DOAJ', fn: () => searchDOAJ('test', 1, 3) },
];

async function probe(entry: typeof PROBES[number]): Promise<SourceHealth> {
  const start = Date.now();
  try {
    const result = await entry.fn();
    const latency = Date.now() - start;
    const hasResults = result.books.length > 0;
    return {
      id: entry.id,
      name: entry.name,
      status: hasResults ? (latency > 4000 ? 'degraded' : 'ok') : 'degraded',
      latencyMs: latency,
      resultCount: result.books.length,
      totalReported: result.total,
    };
  } catch (err) {
    return {
      id: entry.id,
      name: entry.name,
      status: 'down',
      latencyMs: Date.now() - start,
      resultCount: 0,
      totalReported: 0,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

export async function checkAllSources(): Promise<SourceHealth[]> {
  return Promise.all(PROBES.map(probe));
}
