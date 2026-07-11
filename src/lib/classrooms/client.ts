'use client';

import { createClient } from '@/lib/supabase/client';
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
  });

  if (error) return { error: error.message };
  return { error: null, roomCode, inviteToken };
}

export async function setClassroomStatus(id: string, status: 'live' | 'ended'): Promise<{ error: string | null }> {
  const sb = createClient();
  const patch: Record<string, unknown> = { status };
  if (status === 'live') patch.started_at = new Date().toISOString();
  if (status === 'ended') patch.ended_at = new Date().toISOString();
  const { error } = await sb.from('classrooms').update(patch).eq('id', id);
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

export async function sendClassroomMessage(classroomId: string, body: string): Promise<{ error: string | null }> {
  const sb = createClient();
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
