import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Same-origin proxy for external book files, so the ANYFREEBOOK Reader can
 * render PDFs and text from public-domain sources that don't send CORS
 * headers (Project Gutenberg) or block cross-origin fetch.
 *
 * Locked down against SSRF: only whitelisted public book hosts, only GET,
 * only document/image content types, hard size + time limits. It is NOT a
 * general web proxy.
 */

// Suffix-matched host allowlist — trusted public-domain book sources only
const ALLOWED_HOST_SUFFIXES = [
  'gutenberg.org',
  'pglaf.org',        // Gutenberg mirror network
  'archive.org',
  'us.archive.org',
  'openlibrary.org',
  'wikimedia.org',    // Wikisource / Commons scans
];

const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/html',
  'application/epub+zip',
  'application/octet-stream', // Gutenberg often serves .txt as octet-stream
  'image/',
];

const MAX_BYTES = 40 * 1024 * 1024; // 40 MB

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(suffix => h === suffix || h.endsWith(`.${suffix}`));
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }
  if (!hostAllowed(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'ANYFREEBOOK-Reader/1.0', Accept: '*/*' },
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
    }

    const contentType = (upstream.headers.get('content-type') || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.some(t => contentType.startsWith(t) || contentType.includes(t))) {
      return NextResponse.json({ error: 'Content type not allowed' }, { status: 415 });
    }
    const declaredLen = Number(upstream.headers.get('content-length') || 0);
    if (declaredLen && declaredLen > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800', // cache a day client / a week edge
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
