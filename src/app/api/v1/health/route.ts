import { NextRequest } from 'next/server';
import { json, meta, handlePreflight } from '@/lib/api/v1';

/**
 * GET /api/v1/health
 *
 * A liveness probe and a version check. It does not touch any upstream, so
 * it stays fast and stays up even when a source is down.
 */

const startedAt = Date.now();

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function GET(request: NextRequest) {
  return json(request, {
    status: 'ok',
    apiVersion: meta().apiVersion,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    sources: [
      'Project Gutenberg',
      'Open Library',
      'Internet Archive',
      'Google Books',
      'PubMed Central',
      'DOAJ',
      'LibriVox',
    ],
  });
}
