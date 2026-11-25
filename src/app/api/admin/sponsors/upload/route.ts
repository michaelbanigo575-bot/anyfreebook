import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// SVG is left out on purpose: it can carry scripts.
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm',
};
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  const file = (await request.formData().catch(() => null))?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Use JPG, PNG, WebP, GIF, MP4 or WebM' }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 20 MB' }, { status: 413 });

  const sb = createServiceClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('sponsors').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: '31536000' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = sb.storage.from('sponsors').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, media_type: file.type.startsWith('video/') ? 'video' : 'image' });
}
