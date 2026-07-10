import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * AI study aids: summary or quiz for a publication.
 *
 * Economics of the free tier: results are generated ONCE per publication+kind
 * and cached forever in publication_ai, so Gemini's free daily quota is only
 * spent on brand-new content. A per-creator daily cap stops any one author
 * draining the shared pool.
 */

const DAILY_CAP_PER_CREATOR = 20;
const MODEL = 'gemini-2.0-flash';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number; // index into options
  explanation?: string;
}

function prompts(kind: 'summary' | 'quiz', title: string, text: string) {
  const clipped = text.slice(0, 24000); // stay well within input limits
  if (kind === 'summary') {
    return `You are a study assistant. Summarize the following work titled "${title}" for a student.
Respond with STRICT JSON only (no markdown fences): {"summary": "3-5 sentence overview", "keyPoints": ["point", ...max 6]}

TEXT:
${clipped}`;
  }
  return `You are a quiz generator. Create 5 multiple-choice questions testing understanding of the following work titled "${title}".
Respond with STRICT JSON only (no markdown fences): {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "one sentence"}]}
"answer" is the 0-based index of the correct option.

TEXT:
${clipped}`;
}

async function callGemini(prompt: string, apiKey: string): Promise<unknown> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

export async function POST(request: NextRequest) {
  const { slug, kind } = await request.json().catch(() => ({}));
  if (!slug || !['summary', 'quiz'].includes(kind)) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const svc = createServiceClient();

  // 1. Load the publication + its text
  const { data: pub } = await svc
    .from('publications')
    .select('id, author_id, title, body, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (!pub) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // 2. Serve from cache — generated once, free forever
  const { data: cached } = await svc
    .from('publication_ai')
    .select('content, created_at')
    .eq('publication_id', pub.id)
    .eq('kind', kind)
    .maybeSingle();
  if (cached) {
    return NextResponse.json({ content: cached.content, cached: true });
  }

  // 3. Only signed-in users can trigger a fresh generation (guests still get cached ones)
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'sign-in-required' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ai-not-configured' }, { status: 503 });
  }

  // 4. Per-creator daily cap (protects the shared free-tier pool)
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await svc
    .from('publication_ai')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', pub.author_id)
    .gte('created_at', dayStart.toISOString());
  if ((count || 0) >= DAILY_CAP_PER_CREATOR) {
    return NextResponse.json({ error: 'daily-cap-reached' }, { status: 429 });
  }

  // 5. Assemble text: publication body + published chapters
  const { data: chapters } = await svc
    .from('chapters')
    .select('title, body')
    .eq('publication_id', pub.id)
    .eq('status', 'published')
    .order('position');
  const fullText = [
    pub.body || '',
    ...((chapters || []) as { title: string; body: string | null }[]).map(c => `\n\n## ${c.title}\n${c.body || ''}`),
  ].join('').trim();

  if (fullText.length < 200) {
    return NextResponse.json({ error: 'not-enough-text' }, { status: 422 });
  }

  // 6. Generate + cache
  try {
    const content = await callGemini(prompts(kind, pub.title, fullText), apiKey);

    // Light validation
    if (kind === 'quiz') {
      const qs = (content as { questions?: QuizQuestion[] }).questions;
      if (!Array.isArray(qs) || qs.length === 0) throw new Error('bad quiz shape');
    } else {
      if (!(content as { summary?: string }).summary) throw new Error('bad summary shape');
    }

    await svc.from('publication_ai').insert({
      publication_id: pub.id,
      author_id: pub.author_id,
      kind,
      content,
      model: MODEL,
    });

    return NextResponse.json({ content, cached: false });
  } catch (err) {
    console.error('[ai] generation failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'generation-failed' }, { status: 502 });
  }
}
