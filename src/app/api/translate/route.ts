import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase/server';

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
  if (items.join('\n').length > MAX_CHARS) return NextResponse.json({ error: 'Too large' }, { status: 413 });

  // Persistent cache: strings translated once are served from Supabase for
  // every future visitor. Degrades gracefully if the table doesn't exist yet.
  const hashes = items.map(t => createHash('sha1').update(t).digest('hex'));
  const out = new Array<string | null>(items.length).fill(null);
  let sb: ReturnType<typeof createServiceClient> | null = null;
  try {
    sb = createServiceClient();
    const { data } = await sb.from('translation_cache')
      .select('source_hash, translated')
      .eq('lang', to)
      .in('source_hash', Array.from(new Set(hashes)));
    const hitMap: Record<string, string> = {};
    for (const r of (data || []) as { source_hash: string; translated: string }[]) {
      hitMap[r.source_hash] = r.translated;
    }
    hashes.forEach((h, i) => { const hit = hitMap[h]; if (hit !== undefined) out[i] = hit; });
  } catch { sb = null; }

  const missIdx = out.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0);

  if (missIdx.length > 0) {
    try {
      const missTexts = missIdx.map(i => items[i]);
      const translated = await gtxTranslate(missTexts.join('\n'), to);
      let parts = translated !== null ? translated.split('\n') : null;
      // Alignment guard: if the line count drifted, retry item-by-item
      if (!parts || parts.length !== missTexts.length) {
        parts = await Promise.all(missTexts.map(async t => (await gtxTranslate(t, to)) ?? t));
      }
      missIdx.forEach((itemI, j) => { out[itemI] = parts![j]; });

      // Write-through to the cache (best effort, deduped)
      if (sb) {
        const seen = new Set<string>();
        const rows = missIdx.flatMap((itemI, j) => {
          const h = hashes[itemI];
          if (seen.has(h) || !parts![j]?.trim()) return [];
          seen.add(h);
          return [{ lang: to, source_hash: h, source_text: items[itemI], translated: parts![j] }];
        });
        if (rows.length) void sb.from('translation_cache').upsert(rows, { onConflict: 'lang,source_hash' }).then(() => {});
      }
    } catch {
      return NextResponse.json({ error: 'Translate failed' }, { status: 502 });
    }
  }

  return NextResponse.json({ texts: out.map((v, i) => v ?? items[i]), cached: items.length - missIdx.length });
}
