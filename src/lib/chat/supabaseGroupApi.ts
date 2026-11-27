'use client';

import { createClient } from '@/lib/supabase/client';
import { supabaseChatApi } from './supabaseApi';
import { supabaseStudyApi } from './supabaseStudyApi';
import type { Applicant, GroupApi, Permission, GroupMember, GroupMessage, GroupSummary, InvitePreview, PublicGroup, Reaction } from './groups';

type Row = Record<string, unknown>;
// the database function or table does not exist until its script has been run
const MISSING = ['42P01', '42883', 'PGRST202', 'PGRST205'];

/** The live group data. Messages are read through row-level security; everything else goes through database functions. */
export function supabaseGroupApi(userId: string): GroupApi {
  const sb = createClient();
  const chat = supabaseChatApi(userId);

  async function call<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.rpc(name, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  const rows = async (name: string, args?: Record<string, unknown>) => (await call<Row[] | null>(name, args)) || [];
  const run = async (name: string, args: Record<string, unknown>) => { await call(name, args); };
  const personName = (r: Row) => String(r.name || r.handle || 'Reader');

  return {
    study: supabaseStudyApi(),
    async state() {
      const base = await chat.state();
      if (base !== 'ready') return base;
      const { error } = await sb.rpc('chat_my_groups');
      if (!error) return 'ready';
      if (MISSING.includes(error.code)) return 'unavailable';
      throw new Error(error.message);
    },
    suspended: chat.suspended,
    async mine() {
      return (await rows('chat_my_groups')).map((r): GroupSummary => ({
        id: String(r.group_id),
        name: String(r.name),
        description: String(r.description || ''),
        visibility: r.visibility as GroupSummary['visibility'],
        pending: r.status === 'pending',
        isAdmin: !!r.is_admin,
        muted: !!r.muted,
        historyForNew: !!r.history_for_new,
        members: Number(r.members || 0),
        waiting: Number(r.waiting || 0),
        lastBody: String(r.last_body || ''),
        lastSender: String(r.last_sender_name || ''),
        lastAt: String(r.last_message_at),
        unread: Number(r.unread || 0),
      }));
    },
    async discover(search) {
      return (await rows('chat_groups_public', { p_search: search })).map((r): PublicGroup => ({
        id: String(r.group_id), name: String(r.name), description: String(r.description || ''),
        members: Number(r.members || 0), isMember: !!r.is_member, historyForNew: !!r.history_for_new,
      }));
    },
    create: g => call<string>('chat_group_create', { p_name: g.name, p_description: g.description, p_visibility: g.visibility, p_history: g.historyForNew }),
    join: id => run('chat_group_join', { p_group: id }),
    async invitePreview(token) {
      const [r] = await rows('chat_group_invite_preview', { p_token: token });
      return r ? ({
        id: String(r.group_id), name: String(r.name), description: String(r.description || ''),
        members: Number(r.members || 0), status: r.my_status as InvitePreview['status'], historyForNew: !!r.history_for_new,
      }) : null;
    },
    requestToJoin: token => call<'pending' | 'member'>('chat_group_request', { p_token: token }),
    async messages(groupId, limit) {
      const { data, error } = await sb.from('chat_group_messages')
        .select('id, sender_id, body, reply_to, created_at')
        .eq('group_id', groupId).order('id', { ascending: false }).limit(limit + 1);
      if (error) throw new Error(error.message);
      const page = (data || []).slice(0, limit).reverse();
      const ids = page.map(m => m.id);
      const senders = Array.from(new Set(page.map(m => m.sender_id)));
      const names = new Map<string, string>();
      if (senders.length) {
        const found = await sb.from('profiles').select('id, display_name, creator_handle').in('id', senders);
        if (found.error) throw new Error(found.error.message);
        for (const p of found.data || []) names.set(p.id, p.display_name || p.creator_handle || 'Reader');
      }
      // the database answers for up to 200 messages at a time
      const batches: number[][] = [];
      for (let i = 0; i < ids.length; i += 200) batches.push(ids.slice(i, i + 200));
      const counts = (await Promise.all(batches.map(b => rows('chat_group_reaction_counts', { p_group: groupId, p_messages: b })))).flat();
      const reactions = new Map<number, Reaction[]>();
      for (const r of counts) {
        const key = Number(r.message_id);
        reactions.set(key, [...(reactions.get(key) || []), { emoji: String(r.emoji), total: Number(r.total), mine: !!r.mine }]);
      }
      return {
        more: (data || []).length > limit,
        messages: page.map((m): GroupMessage => ({
          id: m.id, senderId: m.sender_id, sender: names.get(m.sender_id) || 'Reader', mine: m.sender_id === userId,
          body: m.body, at: m.created_at, replyTo: m.reply_to, reactions: reactions.get(m.id) || [],
        })),
      };
    },
    send: (id, body, replyTo) => run('chat_group_send', { p_group: id, p_body: body, p_reply_to: replyTo }),
    react: (id, message, emoji) => run('chat_group_react', { p_group: id, p_message: message, p_emoji: emoji }),
    deleteMessage: (id, message) => run('chat_group_delete_message', { p_group: id, p_message: message }),
    report: (id, message, reason, details) => run('chat_group_report', { p_group: id, p_message: message, p_reason: reason, p_details: details }),
    block: async id => { await chat.block(id); },
    markRead: id => run('chat_group_mark_read', { p_group: id }),
    mute: (id, muted) => run('chat_group_mute', { p_group: id, p_muted: muted }),
    leave: id => run('chat_group_leave', { p_group: id }),
    async members(id) {
      return (await rows('chat_group_member_list', { p_group: id })).map((r): GroupMember => ({
        id: String(r.user_id), name: personName(r), handle: (r.handle as string) || null, isAdmin: !!r.is_admin,
      }));
    },
    async applicants(id) {
      return (await rows('chat_group_requests', { p_group: id })).map((r): Applicant => ({
        id: String(r.user_id), name: personName(r), banned: r.status === 'banned',
      }));
    },
    decide: (id, user, approve) => run('chat_group_decide', { p_group: id, p_user: user, p_approve: approve }),
    remove: (id, user, ban) => run('chat_group_remove', { p_group: id, p_user: user, p_ban: ban }),
    unban: (id, user) => run('chat_group_unban', { p_group: id, p_user: user }),
    transfer: (id, user) => run('chat_group_transfer', { p_group: id, p_user: user }),
    update: (id, name, description) => run('chat_group_update', { p_group: id, p_name: name, p_description: description }),
    inviteToken: (id, reset) => call<string>('chat_group_invite_link', { p_group: id, p_reset: reset }),
    close: id => run('chat_group_close', { p_group: id }),
    async controls(id) {
      const [r] = await rows('chat_group_my_controls', { p_group: id });
      if (!r) throw new Error('chat:not-found');
      return {
        rules: String(r.rules || ''), adminsOnly: !!r.admins_only, slowSeconds: Number(r.slow_seconds || 0),
        can: (r.permissions as Permission[]) || [], timedOutUntil: (r.timed_out_until as string) || null,
      };
    },
    async roles(id) {
      return (await rows('chat_group_roles', { p_group: id })).map(r => ({ id: String(r.user_id), permissions: (r.permissions as Permission[]) || [], timedOutUntil: (r.timed_out_until as string) || null }));
    },
    saveSettings: (id, s) => run('chat_group_settings', { p_group: id, p_rules: s.rules, p_admins_only: s.adminsOnly, p_slow_seconds: s.slowSeconds }),
    setHelper: (id, user, permissions) => run('chat_group_set_helper', { p_group: id, p_user: user, p_permissions: permissions }),
    timeout: (id, user, minutes) => run('chat_group_timeout', { p_group: id, p_user: user, p_minutes: minutes }),
    async pinned(id) {
      return (await rows('chat_group_pinned', { p_group: id })).map(r => ({ id: Number(r.message_id), body: String(r.body), sender: String(r.sender_name) }));
    },
    pin: (id, message, pinned) => run('chat_group_pin', { p_group: id, p_message: message, p_pin: pinned }),
    async upcoming(id) {
      return (await rows('chat_group_upcoming', { p_group: id })).map(r => ({ id: String(r.session_id), title: String(r.title), note: String(r.note || ''), startsAt: String(r.starts_at), minutes: Number(r.minutes) }));
    },
    schedule: (id, s) => run('chat_group_schedule', { p_group: id, p_title: s.title, p_note: s.note, p_starts_at: s.startsAt, p_minutes: s.minutes }),
    cancelSession: (id, session) => run('chat_group_cancel_session', { p_group: id, p_session: session }),
    subscribe(onChange, onLive) {
      const channel = sb
        .channel(`groups-${userId}-${Math.random().toString(36).slice(2)}`)
        // new messages, and reaction changes (which update their message)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_group_messages' }, () => onChange())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_group_messages' }, () => onChange())
        .subscribe(status => onLive(status === 'SUBSCRIBED'));
      return () => { void sb.removeChannel(channel); };
    },
  };
}
