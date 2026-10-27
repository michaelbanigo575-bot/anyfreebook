'use client';

import { createClient } from '@/lib/supabase/client';
import { pingIndexNow } from '@/lib/indexnow';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Classroom {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  room_code: string;
  invite_token: string | null;
  publication_id: string | null;
  visibility: 'public' | 'private';
  status: 'scheduled' | 'live' | 'ended';
  scheduled_at: string;
  duration_min: number;
  started_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  peak_attendance: number;
  material_url: string | null;
  material_title: string | null;
  created_at: string;
}

export interface ClassroomMessage {
  id: string;
  classroom_id: string;
  user_id: string | null;
  display_name: string;
  body: string;
  created_at: string;
}

/** One live session of a classroom, kept so a host can see its history. */
export interface ClassroomSession {
  id: string;
  classroom_id: string;
  host_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  attendee_count: number;
  title: string | null;
}

/**
 * One attendee in one session.
 *
 * `user_id` is set when the attendee was signed in, `guest_id` is a stable
 * random id when they were not, and `display_name` is what the host sees.
 */
export interface ClassroomSessionAttendance {
  id: string;
  session_id: string;
  classroom_id: string;
  user_id: string | null;
  guest_id: string | null;
  display_name: string;
  joined_at: string;
  left_at: string | null;
  watch_seconds: number;
}

/**
 * A session with its attendees attached, which is the shape a history list
 * wants: one row per session, each with the people who were there.
 */
export interface ClassroomSessionWithAttendance extends ClassroomSession {
  attendees: ClassroomSessionAttendance[];
}

/**
 * A stable id for a guest who has not signed in.
 *
 * Generated once per browser and kept in localStorage, so the same anonymous
 * attendee is the same person across sessions — the host sees a returning
 * guest as the same guest rather than a new stranger each time.
 */
export function getGuestId(): string {
  const KEY = 'afb_guest_id';
  if (typeof window === 'undefined') return 'guest-server';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

function randomCode(len: number): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createClassroom(input: {
  title: string;
  description?: string;
  scheduledAt: string;      // ISO
  durationMin?: number;
  visibility: 'public' | 'private';
  publicationId?: string | null;
  institutionId?: string | null;
}): Promise<{ error: string | null; roomCode?: string; inviteToken?: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  if (!input.title.trim()) return { error: 'Give your class a title' };

  const roomCode = randomCode(8);
  const inviteToken = input.visibility === 'private' ? randomCode(16) : null;

  const { error } = await sb.from('classrooms').insert({
    host_id: user.id,
    title: input.title.trim(),
    description: input.description || null,
    room_code: roomCode,
    invite_token: inviteToken,
    publication_id: input.publicationId || null,
    visibility: input.visibility,
    scheduled_at: input.scheduledAt,
    duration_min: input.durationMin || 60,
    institution_id: input.institutionId || null,
  });

  if (error) return { error: error.message };
  return { error: null, roomCode, inviteToken };
}

export async function setClassroomStatus(id: string, status: 'live' | 'ended', roomCode?: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const patch: Record<string, unknown> = { status };
  if (status === 'live') patch.started_at = new Date().toISOString();
  if (status === 'ended') patch.ended_at = new Date().toISOString();
  const { error } = await sb.from('classrooms').update(patch).eq('id', id);
  if (!error && status === 'live' && roomCode) void pingIndexNow([`https://anyfreebook.com/class/${roomCode}`]);
  return { error: error?.message ?? null };
}

export async function saveRecordingUrl(id: string, url: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('classrooms').update({ recording_url: url }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteClassroom(id: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('classrooms').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function listMyClassrooms(): Promise<Classroom[]> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from('classrooms').select('*').eq('host_id', user.id).order('scheduled_at', { ascending: false });
  return (data as Classroom[]) || [];
}

/** Attendance: register this browser once per classroom; returns current count. */
export async function joinAttendance(classroomId: string, sessionKey: string, displayName: string | null): Promise<number> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  await sb.from('classroom_attendance').upsert({
    classroom_id: classroomId,
    user_id: user?.id ?? null,
    session_key: sessionKey,
    display_name: displayName,
  }, { onConflict: 'classroom_id,session_key', ignoreDuplicates: true });

  const { count } = await sb.from('classroom_attendance').select('id', { count: 'exact', head: true }).eq('classroom_id', classroomId);
  const attendance = count || 0;

  // Track the high-water mark for the host's analytics (best-effort)
  await sb.from('classrooms').update({ peak_attendance: attendance }).eq('id', classroomId).lt('peak_attendance', attendance);
  return attendance;
}

/**
 * Start a session for a classroom, or return the one already running.
 *
 * A session is what turns "a classroom" into "a history of sessions". The
 * host starts one when the class goes live; the client records attendees
 * against it; the host ends it and the duration is filled in by a trigger.
 */
export async function startClassroomSession(
  classroomId: string,
  title?: string | null
): Promise<{ error: string | null; sessionId?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Sign in first' };

  // Already running? Reuse it, so a refresh mid-class does not start a second
  // session and split the attendance.
  const { data: open } = await sb
    .from('classroom_sessions')
    .select('id')
    .eq('classroom_id', classroomId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) return { error: null, sessionId: open.id };

  const { data, error } = await sb
    .from('classroom_sessions')
    .insert({
      classroom_id: classroomId,
      host_id: user.id,
      title: title || null,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { error: null, sessionId: data.id };
}

/** End a session. The database trigger fills in the duration. */
export async function endClassroomSession(sessionId: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb
    .from('classroom_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  return { error: error?.message ?? null };
}

/**
 * Record an attendee in a session.
 *
 * Signed-in attendees are stored by profile id; anonymous ones get the stable
 * guest id from `getGuestId()`, so a returning guest is still recognisable.
 * `displayName` is what the host sees — the name the attendee typed, or their
 * profile name when they are signed in.
 */
export async function recordSessionAttendance(
  sessionId: string,
  classroomId: string,
  displayName: string | null
): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();

  const name = (displayName || '').trim().slice(0, 60);
  const { data: profile } = user
    ? await sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
    : { data: null };

  const resolved = name || profile?.display_name || (user ? 'Reader' : 'Guest');

  // Upsert on the partial unique index that matches this attendee: the signed
  // in ones are keyed on user_id, the anonymous ones on guest_id. A single
  // composite conflict target would not work, because a NULL guest_id never
  // equals another NULL and would insert a duplicate row on every reconnect.
  const conflict = user ? 'session_id,user_id' : 'session_id,guest_id';

  const { error } = await sb.from('classroom_session_attendance').upsert(
    {
      session_id: sessionId,
      classroom_id: classroomId,
      user_id: user?.id ?? null,
      guest_id: user ? null : getGuestId(),
      display_name: resolved,
    },
    { onConflict: conflict }
  );
  return { error: error?.message ?? null };
}

/** Record how long an attendee stayed. */
export async function recordSessionWatchTime(
  sessionId: string,
  guestId: string | null,
  userId: string | null,
  seconds: number
): Promise<void> {
  const sb = createClient();
  const query = sb
    .from('classroom_session_attendance')
    .update({ watch_seconds: seconds })
    .eq('session_id', sessionId);
  if (userId) await query.eq('user_id', userId);
  else if (guestId) await query.eq('guest_id', guestId);
}

/**
 * The session history of a classroom, newest first, each session with the
 * people who attended it.
 */
export async function listClassroomSessions(
  classroomId: string
): Promise<ClassroomSessionWithAttendance[]> {
  const sb = createClient();
  const { data: sessions } = await sb
    .from('classroom_sessions')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('started_at', { ascending: false });

  const list = (sessions as ClassroomSession[]) || [];
  if (list.length === 0) return [];

  const ids = list.map((s) => s.id);
  const { data: attendance } = await sb
    .from('classroom_session_attendance')
    .select('*')
    .in('session_id', ids)
    .order('joined_at', { ascending: true });

  const bySession = new Map<string, ClassroomSessionAttendance[]>();
  for (const a of (attendance as ClassroomSessionAttendance[]) || []) {
    const list = bySession.get(a.session_id) || [];
    list.push(a);
    bySession.set(a.session_id, list);
  }

  return list.map((s) => ({ ...s, attendees: bySession.get(s.id) || [] }));
}

/** A running-together summary of a classroom's history, for the host's dashboard. */
export async function getClassroomHistorySummary(classroomId: string): Promise<{
  sessions: number;
  totalAttendees: number;
  uniqueAttendees: number;
  totalSeconds: number;
  averageSeconds: number;
  lastSessionAt: string | null;
}> {
  const sessions = await listClassroomSessions(classroomId);
  const attendees = sessions.flatMap((s) => s.attendees);
  const unique = new Set(
    attendees.map((a) => (a.user_id ? `u:${a.user_id}` : `g:${a.guest_id}`))
  );
  const durations = sessions
    .map((s) => s.duration_seconds || 0)
    .filter((d) => d > 0);
  const totalSeconds = durations.reduce((a, b) => a + b, 0);

  return {
    sessions: sessions.length,
    totalAttendees: attendees.length,
    uniqueAttendees: unique.size,
    totalSeconds,
    averageSeconds: durations.length ? Math.round(totalSeconds / durations.length) : 0,
    lastSessionAt: sessions[0]?.started_at || null,
  };
}

export async function sendClassroomMessage(classroomId: string, body: string): Promise<{ error: string | null }> {  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Sign in to chat' };
  const { data: profile } = await sb.from('profiles').select('display_name').eq('id', user.id).single();
  const { error } = await sb.from('classroom_messages').insert({
    classroom_id: classroomId,
    user_id: user.id,
    display_name: profile?.display_name || user.email?.split('@')[0] || 'Reader',
    body: body.trim().slice(0, 500),
  });
  return { error: error?.message ?? null };
}

export async function listClassroomMessages(classroomId: string, limit = 100): Promise<ClassroomMessage[]> {
  const sb = createClient();
  const { data } = await sb
    .from('classroom_messages')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data as ClassroomMessage[]) || [];
}

/**
 * Realtime presence: tracks who is on the classroom page RIGHT NOW.
 * onCount fires with the accurate concurrent viewer count. Returns an unsubscribe fn.
 */
export function trackPresence(classroomId: string, sessionKey: string, onCount: (n: number) => void): () => void {
  const sb = createClient();
  const channel = sb.channel(`presence-${classroomId}`, {
    config: { presence: { key: sessionKey } },
  });
  channel
    .on('presence', { event: 'sync' }, () => {
      onCount(Object.keys(channel.presenceState()).length);
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') channel.track({ joined_at: Date.now() });
    });
  return () => { sb.removeChannel(channel); };
}

/** Host shares (or clears) a document for the whole class — propagates live via the classroom subscription. */
export async function setClassroomMaterial(classroomId: string, url: string | null, title: string | null): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('classrooms')
    .update({ material_url: url, material_title: title })
    .eq('id', classroomId);
  return { error: error?.message ?? null };
}

/** Persist the concurrent-viewers high-water mark (only succeeds for the host, by RLS design). */
export async function bumpPeakAttendance(classroomId: string, watching: number): Promise<void> {
  const sb = createClient();
  await sb.from('classrooms').update({ peak_attendance: watching }).eq('id', classroomId).lt('peak_attendance', watching);
}

/** Live subscriptions: new chat messages + classroom status changes. Returns an unsubscribe fn. */
export function subscribeClassroom(
  classroomId: string,
  onMessage: (m: ClassroomMessage) => void,
  onClassroomUpdate: (c: Partial<Classroom>) => void
): () => void {
  const sb = createClient();
  const channel: RealtimeChannel = sb
    .channel(`classroom-${classroomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'classroom_messages', filter: `classroom_id=eq.${classroomId}` },
      payload => onMessage(payload.new as ClassroomMessage))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classrooms', filter: `id=eq.${classroomId}` },
      payload => onClassroomUpdate(payload.new as Partial<Classroom>))
    .subscribe();

  return () => { sb.removeChannel(channel); };
}
