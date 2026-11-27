import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { createServiceClient } from '@/lib/supabase/server';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { DEFAULT_WELCOME, OFFICIAL_NAME, WELCOME_LIMIT, isOfficialEmail } from '@/lib/chat/welcome';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

async function gate() {
  if (!CHAT_ENABLED) return { refusal: reply({ error: 'Not found' }, 404) };
  const admin = await requireAdmin();
  return admin ? { admin } : { refusal: reply({ error: 'Not allowed' }, 403) };
}

export async function GET() {
  const { refusal } = await gate();
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
  let senderEmail: string | null = null;
  if (saved?.sender_id) {
    const { data } = await sb.from('profiles').select('display_name, creator_handle, email').eq('id', saved.sender_id).maybeSingle();
    const p = data as { display_name: string | null; creator_handle: string | null; email: string | null } | null;
    senderName = p?.display_name || p?.creator_handle || 'Reader';
    senderEmail = p?.email?.toLowerCase() || null;
  }
  return reply({
    enabled: !!saved?.enabled && !!saved.sender_id,
    body: saved?.body || DEFAULT_WELCOME,
    senderName,
    senderEmail,
    senderIsOfficial: !!senderEmail && isOfficialEmail(senderEmail),
    waiting: Number(waiting.data || 0),
  });
}

const REFUSALS: Record<string, string> = {
  'turn-on-chat': 'First sign in as the team account, open /messages and turn messages on. Invite it first while chat is invite-only.',
  'empty-message': 'Write the welcome message first.',
  'message-too-long': 'That message is too long.',
  suspended: 'The team account’s chat is suspended, so it can’t send the welcome.',
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
  const { action, body, enabled, senderEmail } = (await request.json().catch(() => ({}))) as { action?: string; body?: string; enabled?: boolean; senderEmail?: string };
  const sb = createServiceClient();

  if (action === 'save' && typeof body === 'string' && body.length <= WELCOME_LIMIT + 200 && typeof enabled === 'boolean') {
    let sender: string | null = null;
    // only a team account may send it: it can never be made to come from some other person
    const address = typeof senderEmail === 'string' ? senderEmail.trim().toLowerCase() : '';
    if (enabled && isOfficialEmail(address)) {
      const found = await sb.from('profiles').select('id').eq('email', address).maybeSingle();
      sender = (found.data as { id: string } | null)?.id || null;
      if (sender) {
        const account = (await sb.auth.admin.getUserById(sender)).data.user;
        if (!account?.email_confirmed_at || account.email?.toLowerCase() !== address) sender = null;
      }
    }
    if (enabled) {
      if (!sender) return reply({ error: 'Enter the email of a confirmed @anyfreebook.com account. Create it first if it doesn’t exist.' }, 400);
      const renamed = await sb.from('profiles').update({ display_name: OFFICIAL_NAME }).eq('id', sender);
      if (renamed.error) {
        console.error('[chat-welcome]', renamed.error.message);
        return reply({ error: 'Could not name the team account.' }, 500);
      }
    } else {
      // switching off keeps whatever sender was saved
      const current = await sb.from('chat_welcome').select('sender_id').maybeSingle();
      sender = (current.data as { sender_id: string | null } | null)?.sender_id || null;
    }
    const { error } = await sb.rpc('chat_admin_set_welcome', { p_sender: sender, p_body: body, p_enabled: enabled, p_admin: admin!.email });
    if (!error) return reply({ ok: true });
    const known = REFUSALS[error.message.match(/chat:([a-z-]+)/)?.[1] || ''];
    if (known) return reply({ error: known }, 400);
    console.error('[chat-welcome]', error.message);
    return reply({ error: 'Could not save the welcome message.' }, 500);
  }
  if (action === 'send-existing') {
    // a sender saved before this rule must not carry on
    const current = await sb.from('chat_welcome').select('sender_id').maybeSingle();
    const id = (current.data as { sender_id: string | null } | null)?.sender_id;
    const who = id ? await sb.from('profiles').select('email').eq('id', id).maybeSingle() : null;
    if (!isOfficialEmail((who?.data as { email: string | null } | null | undefined)?.email || '')) {
      return reply({ error: 'Choose the ANYFREEBOOK team account and save first.' }, 400);
    }
    const { data, error } = await sb.rpc('chat_admin_welcome_existing');
    if (!error) return reply({ sent: Number(data || 0) });
    console.error('[chat-welcome]', error.message);
    return reply({ error: 'Could not send the welcome message.' }, 500);
  }
  return reply({ error: 'Bad request' }, 400);
}
