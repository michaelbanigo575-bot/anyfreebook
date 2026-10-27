import { NextRequest, NextResponse } from 'next/server';
import { getPublicationBySlug, getPublishedChapters } from '@/lib/creators/server';
import { buildEpub } from '@/lib/creators/epub';

export const dynamic = 'force-dynamic';

/**
 * Download a published work.
 *
 * `?format=epub` builds an EPUB from the published body and its chapters.
 * `?format=txt` serves the plain text. Both are served as real files with a
 * real filename and a Content-Disposition, so the reader gets "download"
 * rather than "a link that opens the text in a tab" — which is what a
 * data-URL download amounts to.
 */

/** Publication bodies are HTML; a text download is the text of the page. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The body of an HTML fragment as EPUB XHTML paragraphs and headings. */
function htmlToXhtml(html: string): string {
  const text = htmlToText(html);
  if (!text) return '    <p></p>';

  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push('    </ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // A line that reads like a heading (short, no terminal punctuation) is
    // treated as one, which keeps the chapter readable in a reader app.
    if (t.length <= 80 && !/[.!?]$/.test(t) && t === t.toUpperCase() && /[A-Z]/.test(t)) {
      closeList();
      out.push(`    <h2>${escapeXml(t)}</h2>`);
      continue;
    }
    if (t.length <= 80 && !/[.!?]$/.test(t) && /^[A-Z][a-z]/.test(t)) {
      closeList();
      out.push(`    <h3>${escapeXml(t)}</h3>`);
      continue;
    }
    if (/^[-•*]\s+/.test(t)) {
      if (!inList) {
        out.push('    <ul>');
        inList = true;
      }
      out.push(`      <li>${escapeXml(t.replace(/^[-•*]\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    out.push(`    <p>${escapeXml(t)}</p>`);
  }
  closeList();

  return out.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80) || 'download'
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const format = (request.nextUrl.searchParams.get('format') || 'epub').toLowerCase();
  if (format !== 'epub' && format !== 'txt') {
    return NextResponse.json({ error: 'format must be epub or txt' }, { status: 400 });
  }

  const data = await getPublicationBySlug(params.slug);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { pub, author } = data;

  // Only a published work is downloadable. A draft is not public.
  if (pub.status !== 'published') {
    return NextResponse.json({ error: 'Not published' }, { status: 403 });
  }

  const chapters = await getPublishedChapters(pub.id);
  const filename = safeFilename(pub.title);

  // A book published as an attached file has no body and no chapters: the
  // file IS the work. Serve it as the download, so "Download EPUB" gives the
  // reader the book the author uploaded rather than nothing.
  const hasOwnText = Boolean(pub.body) || chapters.length > 0;
  if (!hasOwnText && pub.external_url) {
    try {
      const upstream = await fetch(pub.external_url, { redirect: 'follow' });
      if (!upstream.ok) {
        return NextResponse.json({ error: 'The attached file is not available' }, { status: 502 });
      }
      const type = upstream.headers.get('content-type') || 'application/octet-stream';
      const ext = type.includes('pdf') ? 'pdf' : type.includes('epub') ? 'epub' : 'bin';
      const buf = await upstream.arrayBuffer();
      return new NextResponse(buf, {
        headers: {
          'Content-Type': type,
          'Content-Disposition': `attachment; filename="${filename}.${ext}"`,
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch {
      return NextResponse.json({ error: 'The attached file is not available' }, { status: 502 });
    }
  }

  if (format === 'txt') {
    const text = pub.body
      ? htmlToText(pub.body)
      : chapters.map((c) => `${c.title}\n\n${htmlToText(c.body || '')}`).join('\n\n').trim();
    if (!text) {
      // A book published as an attached file has no text to serve. Say so
      // clearly rather than returning a bare 404.
      return NextResponse.json(
        {
          error: 'This work is published as a file, so there is no plain-text version. Use the file download instead.',
          file: pub.external_url,
        },
        { status: 409 }
      );
    }
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.txt"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const epubChapters = pub.body
    ? [{ title: pub.title, html: htmlToXhtml(pub.body) }]
    : chapters.length > 0
      ? chapters.map((c) => ({ title: c.title, html: htmlToXhtml(c.body || '') }))
      : [];

  if (epubChapters.length === 0) {
    return NextResponse.json({ error: 'There is no downloadable file for this work yet' }, { status: 404 });
  }

  const epub = buildEpub({
    title: pub.title,
    author: author?.display_name || 'ANYFREEBOOK Author',
    description: pub.description || pub.subtitle || null,
    identifier: pub.id,
    chapters: epubChapters,
  });

  return new NextResponse(new Uint8Array(epub), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${filename}.epub"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
