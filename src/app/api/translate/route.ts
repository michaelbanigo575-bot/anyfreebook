import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Free page translation: proxies Google Translate's public gtx endpoint
 * (no API key). The client sends batches of UI strings; we translate and
 * return them aligned. Newlines delimit items — gtx preserves them.
 */

const MAX_ITEMS = 120;
const MAX_CHARS = 9000;

async function gtxTranslate(joined: string, to: string): Promise<string | null> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(joined)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // data[0] = [[translated, original, ...], ...] — concatenate all segments
  if (!Array.isArray(data?.[0])) return null;
  return (data[0] as [string, string][]).map(seg => seg?.[0] ?? '').join('');
}

export async function POST(request: NextRequest) {
  // 40 batches/min per IP ≈ several full page translations — humans never hit it
  const rl = rateLimit(`tr:${clientIp(request.headers)}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }

  const { texts, to } = await request.json().catch(() => ({}));
  if (!Array.isArray(texts) || !texts.length || typeof to !== 'string' || !/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(to)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const items: string[] = texts.slice(0, MAX_ITEMS).map(t => String(t).slice(0, 500));
  const joined = items.join('\n');
  if (joined.length > MAX_CHARS) return NextResponse.json({ error: 'Too large' }, { status: 413 });

  try {
    const translated = await gtxTranslate(joined, to);
    if (translated === null) return NextResponse.json({ error: 'Upstream failed' }, { status: 502 });

    let parts = translated.split('\n');
    // Alignment guard: if the line count drifted, retry item-by-item for correctness
    if (parts.length !== items.length) {
      parts = await Promise.all(items.map(async t => (await gtxTranslate(t, to)) ?? t));
    }
    return NextResponse.json({ texts: parts });
  } catch {
    return NextResponse.json({ error: 'Translate failed' }, { status: 502 });
  }
}
