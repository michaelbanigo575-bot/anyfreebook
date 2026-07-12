import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Classroom } from './client';

export interface ClassroomWithHost extends Classroom {
  host?: { display_name: string | null; creator_handle: string | null } | null;
  publication?: { title: string; slug: string } | null;
}

/** A class still 'live' 6h past its planned end was abandoned (host closed the tab without ending it). */
const STALE_GRACE_MS = 6 * 60 * 60 * 1000;

export function isStaleLive(c: Pick<Classroom, 'status' | 'scheduled_at' | 'started_at' | 'duration_min'>): boolean {
  if (c.status !== 'live') return false;
  const startedAt = new Date(c.started_at || c.scheduled_at).getTime();
  return Date.now() > startedAt + (c.duration_min || 60) * 60 * 1000 + STALE_GRACE_MS;
}

/** Lazily auto-end abandoned live classes (fire-and-forget, service role — RLS limits updates to hosts). */
export function autoEndStale(classes: Pick<Classroom, 'id' | 'status' | 'scheduled_at' | 'started_at' | 'duration_min'>[]): void {
  const staleIds = classes.filter(isStaleLive).map(c => c.id);
  if (staleIds.length === 0) return;
  try {
    const svc = createServiceClient();
    void svc.from('classrooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .in('id', staleIds)
      .then(() => {});
  } catch { /* cleanup is best-effort */ }
}

export async function getClassroomByCode(code: string): Promise<ClassroomWithHost | null> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('classrooms')
      .select('*, host:profiles!classrooms_host_id_fkey(display_name, creator_handle), publication:publications(title, slug)')
      .eq('room_code', code)
      .single();
    const room = data as unknown as ClassroomWithHost | null;
    if (room && isStaleLive(room)) {
      autoEndStale([room]);
      room.status = 'ended';
    }
    return room;
  } catch {
    return null;
  }
}

export async function getUpcomingClassrooms(limit = 20): Promise<ClassroomWithHost[]> {
  try {
    const sb = createClient();
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // include recently started
    const { data } = await sb
      .from('classrooms')
      .select('*, host:profiles!classrooms_host_id_fkey(display_name, creator_handle), publication:publications(title, slug)')
      .eq('visibility', 'public')
      .neq('status', 'ended')
      .gte('scheduled_at', cutoff)
      .order('scheduled_at', { ascending: true })
      .limit(limit);
    const rooms = (data as unknown as ClassroomWithHost[]) || [];
    autoEndStale(rooms);
    return rooms.filter(c => !isStaleLive(c));
  } catch {
    return [];
  }
}

/** The author's currently-live PUBLIC class, if any — for LIVE badges on their pages. */
export async function getLiveClassForAuthor(authorId: string): Promise<{ room_code: string; title: string } | null> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('classrooms')
      .select('id, room_code, title, status, scheduled_at, started_at, duration_min')
      .eq('host_id', authorId)
      .eq('visibility', 'public')
      .eq('status', 'live')
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    if (isStaleLive(data as Classroom)) { autoEndStale([data as Classroom]); return null; }
    return { room_code: data.room_code, title: data.title };
  } catch {
    return null;
  }
}

export async function getPastClassrooms(limit = 12): Promise<ClassroomWithHost[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('classrooms')
      .select('*, host:profiles!classrooms_host_id_fkey(display_name, creator_handle), publication:publications(title, slug)')
      .eq('visibility', 'public')
      .eq('status', 'ended')
      .not('recording_url', 'is', null)
      .order('scheduled_at', { ascending: false })
      .limit(limit);
    return (data as unknown as ClassroomWithHost[]) || [];
  } catch {
    return [];
  }
}
