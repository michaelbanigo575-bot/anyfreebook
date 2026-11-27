'use client';

import { createClient } from '@/lib/supabase/client';
import type { ChatApi, Message, Person, Thread, Unread } from './types';

/** The live chat data. Reads go through row-level security; every change goes through a database function. */
export function supabaseChatApi(userId: string): ChatApi {
  const sb = createClient();

  async function call<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(error.message);
    return data as T;
  }

  const people = async (ids: string[]): Promise<Person[]> => {
    if (!ids.length) return [];
    const { data, error } = await sb.from('profiles').select('id, display_name, creator_handle').in('id', ids);
    if (error) throw new Error(error.message);
    return (data || []).map(p => ({ id: p.id, name: p.display_name || p.creator_handle || 'Reader', handle: p.creator_handle }));
  };

  return {
    async state() {
      const { data, error } = await sb.from('chat_settings').select('user_id').eq('user_id', userId).maybeSingle();
      if (error) {
        // the table does not exist until the database script has been run
        if (error.code === '42P01' || error.code === 'PGRST205') return 'unavailable';
        throw new Error(error.message);
      }
      return data ? 'ready' : 'needs-setup';
    },
    enable: () => call('chat_enable', { p_is_adult: true }),
    suspended: async () => !!(await call('chat_am_suspended')),
    async inbox() {
      const rows = await call<Record<string, unknown>[]>('chat_inbox');
      return (rows || []).map((r): Thread => ({
        id: String(r.conversation_id),
        otherId: String(r.other_id),
        name: String(r.other_name || r.other_handle || 'Reader'),
        handle: (r.other_handle as string) || null,
        status: r.status as Thread['status'],
        isRequest: !!r.is_request,
        lastBody: String(r.last_body || ''),
        lastMine: r.last_sender === userId,
        lastAt: String(r.last_message_at),
        unread: Number(r.unread || 0),
      }));
    },
    async unread() {
      const [rows, groups] = await Promise.all([
        call<Record<string, unknown>[]>('chat_unread'),
        // groups may not be set up yet; one-to-one counts must still show
        sb.rpc('chat_group_unread').then(r => (r.error ? null : (r.data as Record<string, unknown>[] | null))),
      ]);
      return {
        messages: Number(rows?.[0]?.messages || 0),
        requests: Number(rows?.[0]?.requests || 0),
        groupMessages: Number(groups?.[0]?.messages || 0),
        joinRequests: Number(groups?.[0]?.requests || 0),
      } as Unread;
    },
    subscribe(onChange, onLive) {
      // a fresh name each time: two listeners must never share one channel
      const channel = sb
        .channel(`chat-${userId}-${Math.random().toString(36).slice(2)}`)
        // Row-level security decides which rows reach this person
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => onChange())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_conversations' }, () => onChange())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_conversations' }, () => onChange())
        // naming a table that is not live yet would stop the whole channel, so groups have their own
        .subscribe(status => onLive(status === 'SUBSCRIBED'));
      const groupChannel = sb
        .channel(`chat-groups-badge-${userId}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_group_messages' }, () => onChange())
        .subscribe();
      return () => { void sb.removeChannel(channel); void sb.removeChannel(groupChannel); };
    },
    async messages(threadId) {
      const { data, error } = await sb.from('chat_messages').select('id, sender_id, body, created_at').eq('conversation_id', threadId).order('id', { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return (data || []).reverse().map((m): Message => ({ id: m.id, mine: m.sender_id === userId, body: m.body, at: m.created_at }));
    },
    send: (threadId, body) => call('chat_send', { p_conversation: threadId, p_body: body }),
    start: (toId, body) => call<string>('chat_start', { p_to: toId, p_body: body }),
    async person(id) {
      const [found] = await people([id]);
      if (!found) return null;
      const [out, back] = await Promise.all([
        sb.from('author_follows').select('id').eq('follower_id', userId).eq('author_id', id).maybeSingle(),
        sb.from('author_follows').select('id').eq('follower_id', id).eq('author_id', userId).maybeSingle(),
      ]);
      return { ...found, mutual: !!out.data && !!back.data };
    },
    respond: (threadId, accept) => call('chat_respond', { p_conversation: threadId, p_accept: accept }),
    markRead: threadId => call('chat_mark_read', { p_conversation: threadId }),
    block: id => call('chat_block', { p_user: id }),
    unblock: id => call('chat_unblock', { p_user: id }),
    async blocked() {
      const { data, error } = await sb.from('chat_blocks').select('blocked_id').eq('blocker_id', userId);
      if (error) throw new Error(error.message);
      return people((data || []).map(r => r.blocked_id));
    },
    report: (threadId, reason, details) => call('chat_report', { p_conversation: threadId, p_reason: reason, p_details: details }),
    async allowsRequests() {
      const { data, error } = await sb.from('chat_settings').select('allow_requests').eq('user_id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      return data?.allow_requests ?? true;
    },
    setAllowsRequests: allow => call('chat_set_requests', { p_allow: allow }),
  };
}
