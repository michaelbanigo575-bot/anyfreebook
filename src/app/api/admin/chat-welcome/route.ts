import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/server';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { DEFAULT_WELCOME, WELCOME_LIMIT } from '@/lib/chat/welcome';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

async function gate() {
  if (!CHAT_ENABLED) return { refusal: reply({ error: 'Not found' }, 404) };
  const admin = await requireAdmin();
  return admin ? { admin } : { refusal: reply({ error: 'Not allowed' }, 403) };
}

export async function GET() {
  const { admin, refusal } = await gate();
  if (refusal) return refusal;
  const sb = createServiceClient();
  const [row, waiting] = await Promise.all([
    sb.from('chat_welcome').select('enabled, body, sender_id').maybeSingle(),
    sb.rpc('chat_admin_welcome_waiting'),
  ]);
  if (row.error || waiting.error) {
    console.error('[chat-welcome]', (row.error || waiting.error)!.message);
    return reply({ error: 'Could not load the welcome message. Has 026_chat_welcome.sql been run?' }, 500);
  }
  const saved = row.data as { enabled: boolean; body: string; sender_id: string | null } | null;
  let senderName: string | null = null;
  if (saved?.sender_id) {
    const { data } = await sb.from('profiles').select('display_name, creator_handle').eq('id', saved.sender_id).maybeSingle();
    const p = data as { display_name: string | null; creator_handle: string | null } | null;
    senderName = p?.display_name || p?.creator_handle || 'Reader';
  }
  return reply({
    enabled: !!saved?.enabled && !!saved.sender_id,
    body: saved?.body || DEFAULT_WELCOME,
    senderName,
    senderIsMe: saved?.sender_id === admin!.id,
    waiting: Number(waiting.data || 0),
  });
}

const REFUSALS: Record<string, string> = {
  'turn-on-chat': 'First turn on messages for your own account at /messages. The welcome is sent from it.',
  'empty-message': 'Write the welcome message first.',
  'message-too-long': 'That message is too long.',
  suspended: 'Your chat is suspended, so it can’t send the welcome.',
};

export async function POST(request: NextRequest) {
  const { admin, refusal } = await gate();
  if (refusal) return refusal;
  const origin = request.headers.get('origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch { /* treated as foreign */ }
    if (host !== request.headers.get('host')) return reply({ error: 'Not allowed' }, 403);
  }
  const { action, body, enabled } = (await request.json().catch(() => ({}))) as { action?: string; body?: string; enabled?: boolean };
  const sb = createServiceClient();

  if (action === 'save' && typeof body === 'string' && body.length <= WELCOME_LIMIT + 200 && typeof enabled === 'boolean') {
    // the sender is always the signed-in admin, never an account named by the page
    const { error } = await sb.rpc('chat_admin_set_welcome', { p_sender: admin!.id, p_body: body, p_enabled: enabled, p_admin: admin!.email });
    if (!error) return reply({ ok: true });
    const known = REFUSALS[error.message.match(/chat:([a-z-]+)/)?.[1] || ''];
    if (known) return reply({ error: known }, 400);
    console.error('[chat-welcome]', error.message);
    return reply({ error: 'Could not save the welcome message.' }, 500);
  }
  if (action === 'send-existing') {
    const { data, error } = await sb.rpc('chat_admin_welcome_existing');
    if (!error) return reply({ sent: Number(data || 0) });
    console.error('[chat-welcome]', error.message);
    return reply({ error: 'Could not send the welcome message.' }, 500);
  }
  return reply({ error: 'Bad request' }, 400);
}
