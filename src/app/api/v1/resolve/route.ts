import { NextRequest } from 'next/server';
import { resolveBookSource } from '@/lib/api/resolveSource';
import { gutenbergFiles, fetchArchiveItem, type PublicFile } from '@/lib/api/publicRecords';
import { guard, json, meta, handlePreflight } from '@/lib/api/v1';

/**
 * GET /api/v1/resolve?title=<title>[&author=<author>]
 *
 * The authoritative answer to "can I actually read this for free?".
 *
 * /search reports a tier per hit as it goes; /resolve does the careful work
 * for one title: it asks Project Gutenberg for a real ebook and checks the
 * author actually matches, so a book by "Austen" never resolves to a different
 * book that merely shares a surname.
 */

const MAX_TITLE_LENGTH = 300;

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

export async function GET(request: NextRequest) {
  const { key, response } = await guard(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') || '').trim();
  const author = (searchParams.get('author') || '').trim();

  if (!title) {
    return json(request, { error: 'Missing required parameter: title' }, 400);
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return json(request, { error: `Title is too long (max ${MAX_TITLE_LENGTH} characters).` }, 400);
  }

  try {
    const resolved = await resolveBookSource(title, author);

    if (!resolved) {
      return json(
        request,
        {
          title,
          author: author || null,
          tier: 'unverified',
          tierReason: 'No source could be reached for this title.',
          sourceType: null,
          sourceUrl: null,
          license: null,
          files: [],
          links: [],
          meta: meta({ caller: key?.label }),
        },
        200
      );
    }

    // A Gutenberg match already carries a verified ebook id, so offer the
    // real files rather than only a link to the catalogue page. An Internet
    // Archive match carries the item identifier, and the item's own metadata
    // says which files can be downloaded and whether the copy is loan-only.
    const files: PublicFile[] = [];
    let license: string | null = resolved.tier === 'download' ? 'Public domain' : null;
    if (resolved.sourceType === 'gutenberg') {
      const ebookId = parseInt((resolved.sourceUrl.match(/ebooks\/(\d+)/) || [])[1] || '', 10);
      if (Number.isFinite(ebookId) && ebookId > 0) files.push(...gutenbergFiles(ebookId));
    } else if (resolved.sourceType === 'archive') {
      const identifier = (resolved.sourceUrl.match(/archive\.org\/details\/([^/?#]+)/) || [])[1];
      if (identifier) {
        const item = await fetchArchiveItem(decodeURIComponent(identifier));
        if (item) {
          if (item.restricted) {
            resolved.tier = 'borrow';
            license = null;
          } else {
            files.push(...item.files);
          }
          if (item.rights) license = item.rights;
        }
      }
    }

    const tierReason =
      resolved.tier === 'download'
        ? resolved.sourceType === 'gutenberg'
          ? 'Verified public-domain full text on Project Gutenberg.'
          : 'Open-access copy on the Internet Archive.'
        : resolved.tier === 'borrow'
          ? 'A real Internet Archive copy exists, but it is borrow-only: a free Internet Archive account and a loan are required, so it is not a direct download.'
          : 'A catalogue record or search page was found, but no confirmed free, legally readable copy of this exact title.';

    return json(request, {
      title,
      author: author || null,
      tier: resolved.tier,
      tierReason,
      sourceType: resolved.sourceType,
      sourceUrl: resolved.sourceUrl,
      license,
      files,
      links: resolved.downloadLinks,
      meta: meta({ caller: key?.label }),
    });
  } catch (error) {
    console.error('[api/v1/resolve] failed:', error);
    return json(request, { error: 'Resolve failed. Please try again.' }, 500);
  }
}
