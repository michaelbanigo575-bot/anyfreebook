import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Converts a just-uploaded Word/PowerPoint file to PDF via CloudConvert
 * (free tier: 25 conversion minutes/day, no card required), then stores the
 * result back in our own Supabase Storage and returns its public URL.
 *
 * Only accepts URLs on our OWN storage bucket — this is not a general
 * conversion proxy, it only ever processes files we just uploaded ourselves.
 * Requires CLOUDCONVERT_API_KEY; returns 501 (caller falls back gracefully)
 * if unset.
 */

const CLOUDCONVERT_API = 'https://api.cloudconvert.com/v2';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 55_000; // stay under typical serverless function time limits

function ourStorageHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  } catch {
    return null;
  }
}

async function cloudConvert(path: string, apiKey: string, init?: RequestInit) {
  const res = await fetch(`${CLOUDCONVERT_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`CloudConvert ${res.status}: ${JSON.stringify(json?.message || json)}`);
  return json;
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(`c2pdf:${clientIp(request.headers)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Conversion not configured' }, { status: 501 });

  const { url, format } = await request.json().catch(() => ({}));
  if (typeof url !== 'string') return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const host = ourStorageHost();
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }
  if (!host || sourceUrl.hostname !== host) {
    return NextResponse.json({ error: 'Only files on our own storage can be converted' }, { status: 403 });
  }
  const inputFormat = typeof format === 'string' && /^[a-z]{2,5}$/i.test(format) ? format.toLowerCase() : 'docx';

  try {
    // 1. Create a job: import the file, convert it, export a download link
    const job = await cloudConvert('/jobs', apiKey, {
      method: 'POST',
      body: JSON.stringify({
        tasks: {
          'import-file': { operation: 'import/url', url: sourceUrl.toString() },
          'convert-file': { operation: 'convert', input: 'import-file', output_format: 'pdf', input_format: inputFormat },
          'export-file': { operation: 'export/url', input: 'convert-file' },
        },
      }),
    });
    const jobId = job?.data?.id;
    if (!jobId) throw new Error('No job id returned');

    // 2. Poll until the job finishes (or times out)
    const deadline = Date.now() + MAX_POLL_MS;
    let exportUrl: string | null = null;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      const status = await cloudConvert(`/jobs/${jobId}`, apiKey);
      const tasks = status?.data?.tasks || [];
      const exportTask = tasks.find((t: { name: string }) => t.name === 'export-file');
      if (exportTask?.status === 'error') throw new Error(exportTask.message || 'Conversion failed');
      if (exportTask?.status === 'finished') {
        exportUrl = exportTask.result?.files?.[0]?.url || null;
        break;
      }
    }
    if (!exportUrl) return NextResponse.json({ error: 'Conversion timed out' }, { status: 504 });

    // 3. Download the converted PDF and store it in our own bucket
    const pdfRes = await fetch(exportUrl, { signal: AbortSignal.timeout(20000) });
    if (!pdfRes.ok) throw new Error(`Fetching converted file failed: ${pdfRes.status}`);
    const pdfBuf = await pdfRes.arrayBuffer();

    const sb = createServiceClient();
    const origPath = decodeURIComponent(sourceUrl.pathname.split('/publications/')[1] || '');
    const pdfPath = origPath.replace(/\.[a-z0-9]+$/i, '') + `-converted-${Date.now()}.pdf`;
    const { error: uploadErr } = await sb.storage.from('publications').upload(pdfPath, Buffer.from(pdfBuf), {
      contentType: 'application/pdf',
      cacheControl: '31536000',
      upsert: false,
    });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: pub } = sb.storage.from('publications').getPublicUrl(pdfPath);
    return NextResponse.json({ url: pub.publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Conversion failed' }, { status: 502 });
  }
}
