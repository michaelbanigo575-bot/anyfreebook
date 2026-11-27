import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/server';
import { CHAT_ENABLED } from '@/lib/chat/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// invite lists hold email addresses: never stored by a browser or a cache
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

async function gate() {
  if (!CHAT_ENABLED) return { refusal: reply({ error: 'Not found' }, 404) };
  const admin = await requireAdmin();
  return admin ? { admin } : { refusal: reply({ error: 'Not allowed' }, 403) };
}

export async function GET() {
  const { refusal } = await gate();
  if (refusal) return refusal;
  const sb = createServiceClient();
  const [mode, invites] = await Promise.all([
    sb.from('chat_trial').select('invite_only').maybeSingle(),
    sb.from('chat_invites').select('email, added_by, created_at').order('created_at', { ascending: false }).limit(500),
  ]);
  if (mode.error || invites.error) {
    console.error('[chat-trial]', (mode.error || invites.error)!.message);
    return reply({ error: 'Could not load the trial list. Has 025_chat_trial.sql been run?' }, 500);
  }
  // a missing setting means closed, the same as in the database
  return reply({ inviteOnly: mode.data?.invite_only ?? true, invites: ((invites.data || []) as { email: string; added_by: string; created_at: string }[]).map(i => ({ email: i.email, addedBy: i.added_by, at: i.created_at })) });
}

export async function POST(request: NextRequest) {
  const { admin, refusal } = await gate();
  if (refusal) return refusal;
  const origin = request.headers.get('origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch { /* treated as foreign */ }
    if (host !== request.headers.get('host')) return reply({ error: 'Not allowed' }, 403);
  }
  const { action, email, inviteOnly } = (await request.json().catch(() => ({}))) as { action?: string; email?: string; inviteOnly?: boolean };
  const sb = createServiceClient();

  let error: { message: string } | null;
  if (action === 'add' || action === 'remove') {
    const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (address.length > 254 || !EMAIL.test(address)) return reply({ error: 'Enter one valid email address.' }, 400);
    ({ error } = action === 'add'
      ? await sb.from('chat_invites').upsert({ email: address, added_by: admin!.email }, { onConflict: 'email', ignoreDuplicates: true })
      : await sb.from('chat_invites').delete().eq('email', address));
  } else if (action === 'mode' && typeof inviteOnly === 'boolean') {
    ({ error } = await sb.from('chat_trial').upsert({ id: true, invite_only: inviteOnly, updated_by: admin!.email, updated_at: new Date().toISOString() }));
  } else {
    return reply({ error: 'Bad request' }, 400);
  }
  if (error) {
    console.error('[chat-trial]', error.message);
    return reply({ error: 'Could not save the change.' }, 500);
  }
  return reply({ ok: true });
}
