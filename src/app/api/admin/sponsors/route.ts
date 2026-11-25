import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/server';
import { parseSponsor } from '@/lib/sponsors/types';

export const dynamic = 'force-dynamic';

const denied = () => NextResponse.json({ error: 'Not allowed' }, { status: 403 });
const failed = (message: string) => NextResponse.json({ error: message }, { status: 500 });

export async function GET() {
  if (!(await requireAdmin())) return denied();
  const { data, error } = await createServiceClient().from('sponsors').select('*').order('updated_at', { ascending: false });
  return error ? failed(error.message) : NextResponse.json({ sponsors: data });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return denied();
  const input = await request.json().catch(() => null);
  if (!input) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const parsed = parseSponsor(input);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const sb = createServiceClient();
  const row = { ...parsed.value, updated_at: new Date().toISOString() };
  const { error } = typeof input.id === 'string' && input.id
    ? await sb.from('sponsors').update(row).eq('id', input.id)
    : await sb.from('sponsors').insert(row);
  return error ? failed(error.message) : NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return denied();
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await createServiceClient().from('sponsors').delete().eq('id', id);
  return error ? failed(error.message) : NextResponse.json({ ok: true });
}
