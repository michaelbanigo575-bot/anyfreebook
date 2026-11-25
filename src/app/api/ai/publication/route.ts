import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimitEdge } from '@/lib/rateLimit';
import { fitToModel, markupToText, readBookFile } from '@/lib/ai/bookText';
import { VERSION, buildPrompt, checkQuiz, checkSummary, type Kind } from '@/lib/ai/studyAids';

/**
 * AI study aids: summary or quiz for any publication, whether its text was typed into the app or
 * uploaded as a file.
 *
 * Economics of the free tier: results are generated once per publication+kind and cached in
 * publication_ai, and made again only when the work itself changes. A per-creator daily cap stops
 * any one author draining the shared pool.
 */

export const maxDuration = 60;

const DAILY_CAP_PER_CREATOR = 20;
// Lite first: it is fast and reliably under free-tier capacity.
const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const GEMINI = 'https://generativelanguage.googleapis.com';
const INLINE_LIMIT = 13 * 1024 * 1024; // bigger PDFs are uploaded to Gemini first

type Part = { text: string } | { inlineData: { mimeType: string; data: string } } | { fileData: { mimeType: string; fileUri: string } };

async function pdfPart(bytes: Uint8Array, apiKey: string): Promise<Part> {
  if (bytes.length <= INLINE_LIMIT) {
    return { inlineData: { mimeType: 'application/pdf', data: Buffer.from(bytes).toString('base64') } };
  }
  const res = await fetch(`${GEMINI}/upload/v1beta/files`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'X-Goog-Upload-Protocol': 'raw', 'Content-Type': 'application/pdf' },
    body: new Blob([bytes as BlobPart]),
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`Gemini upload ${res.status}`);
  let file = (await res.json()).file as { name: string; uri: string; state: string };
  for (let i = 0; file.state === 'PROCESSING' && i < 20; i++) {
    await new Promise(r => setTimeout(r, 1500));
    file = await (await fetch(`${GEMINI}/v1beta/${file.name}`, { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(10000) })).json();
  }
  if (file.state !== 'ACTIVE') throw new Error(`Gemini file ${file.state}`);
  return { fileData: { mimeType: 'application/pdf', fileUri: file.uri } };
}

async function callModel(model: string, parts: Part[], apiKey: string, timeout: number): Promise<unknown> {
  const res = await fetch(`${GEMINI}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 8192 },
    }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('');
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  const { slug, kind } = (await request.json().catch(() => ({}))) as { slug?: string; kind?: Kind };
  if (!slug || (kind !== 'summary' && kind !== 'quiz')) return fail('invalid request', 400);

  const svc = createServiceClient();

  // 1. Load the work
  const { data: pub } = await svc
    .from('publications')
    .select('id, author_id, title, description, body, external_url, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (!pub) return fail('not found', 404);
  const { data: chapters } = await svc
    .from('chapters')
    .select('title, body')
    .eq('publication_id', pub.id)
    .eq('status', 'published')
    .order('position');
  const written = [
    markupToText(pub.body || ''),
    ...((chapters || []) as { title: string; body: string | null }[]).map(c => `## ${c.title}\n${markupToText(c.body || '')}`),
  ].join('\n\n').trim();
  // Changes whenever the title, text, chapters or attached file change
  const fingerprint = createHash('sha1').update(`${pub.title}\n${pub.external_url || ''}\n${written}`).digest('hex');

  // 2. Serve from cache while the work is unchanged
  const { data: cached } = await svc.from('publication_ai').select('content').eq('publication_id', pub.id).eq('kind', kind).maybeSingle();
  const saved = cached?.content as { _v?: number; _src?: string } | undefined;
  if (saved && saved._v === VERSION && saved._src === fingerprint) return NextResponse.json({ content: saved, cached: true });

  // 3. Only signed-in readers can start a new one. Guests still get an older result if there is one.
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return saved ? NextResponse.json({ content: saved, cached: true }) : fail('sign-in-required', 401);

  const apiKey = process.env.GEMINI_API_KEY;
  const giveOld = (error: string, status: number) => (saved ? NextResponse.json({ content: saved, cached: true }) : fail(error, status));
  if (!apiKey) return giveOld('ai-not-configured', 503);

  const rl = await rateLimitEdge(`ai:${user.id}`, 8, 60_000);
  if (!rl.ok) return giveOld('slow-down', 429);

  // 4. Per-creator daily cap (protects the shared free-tier pool)
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await svc.from('publication_ai').select('id', { count: 'exact', head: true }).eq('author_id', pub.author_id).gte('created_at', dayStart.toISOString());
  if ((count || 0) >= DAILY_CAP_PER_CREATOR) return giveOld('daily-cap-reached', 429);

  try {
    // 5. Gather everything the work contains: typed text plus the attached file
    const file = pub.external_url ? await readBookFile(pub.external_url) : null;
    const fileText = file?.kind === 'text' ? file.text : '';
    const text = fitToModel([written, fileText].filter(Boolean).join('\n\n'));
    const isPdf = file?.kind === 'pdf';
    const words = isPdf ? null : text.split(/\s+/).filter(Boolean).length;

    if (!isPdf && (words || 0) < 12) {
      if (file?.kind === 'too-large') return giveOld('file-too-large', 422);
      if (file?.kind === 'unreachable') return giveOld('file-unreachable', 422);
      if (file?.kind === 'unsupported') return giveOld('file-unsupported', 422);
      return giveOld('not-enough-text', 422);
    }

    const parts: Part[] = [{ text: buildPrompt(kind, pub.title, words) }];
    if (file?.kind === 'pdf') parts.push(await pdfPart(file.bytes, apiKey));
    if (text) parts.push({ text: `THE WORK:\n${text}` });

    // 6. Generate, check the result, and try the next model if either step fails
    let content: object | null = null;
    let model = '';
    for (const candidate of MODELS) {
      try {
        const raw = await callModel(candidate, parts, apiKey, isPdf || text.length > 60_000 ? 55000 : 28000);
        content = kind === 'quiz' ? checkQuiz(raw) : checkSummary(raw);
        if (!content) throw new Error(`bad ${kind} shape`);
        model = candidate;
        break;
      } catch (err) {
        console.error(`[ai] ${candidate} failed:`, err instanceof Error ? err.message.slice(0, 200) : err);
      }
    }
    if (!content) return giveOld('generation-failed', 502);

    // A file that could not be read means the aid covers only the typed text: say so
    const partial = !!file && file.kind !== 'text' && file.kind !== 'pdf';
    const result = { ...content, partial, _v: VERSION, _src: fingerprint };
    const { error: saveError } = await svc.from('publication_ai').upsert(
      { publication_id: pub.id, author_id: pub.author_id, kind, content: result, model, created_at: new Date().toISOString() },
      { onConflict: 'publication_id,kind' },
    );
    if (saveError) console.error('[ai] could not cache result:', saveError.message);

    return NextResponse.json({ content: result, cached: false });
  } catch (err) {
    console.error('[ai] generation failed:', err instanceof Error ? err.message : err);
    return giveOld('generation-failed', 502);
  }
}
