import { NextRequest } from 'next/server';
import { json, meta } from '@/lib/api/v1';
import { SOURCE_REGISTRY, LOCAL_CATALOGUE } from '@/lib/api/sources';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/sources
 *
 * What each source is, what tier its results carry and whether the result
 * comes with a file. Served from the same registry the developer page
 * renders, so the two cannot disagree.
 */
export async function GET(request: NextRequest) {
  return json(request, {
    sources: [LOCAL_CATALOGUE, ...SOURCE_REGISTRY],
    ...meta(),
  });
}
