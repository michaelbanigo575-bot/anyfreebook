import { createClient } from '@/lib/supabase/server';
import type { Classroom } from './client';

export interface ClassroomWithHost extends Classroom {
  host?: { display_name: string | null; creator_handle: string | null } | null;
  publication?: { title: string; slug: string } | null;
}

export async function getClassroomByCode(code: string): Promise<ClassroomWithHost | null> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('classrooms')
      .select('*, host:profiles!classrooms_host_id_fkey(display_name, creator_handle), publication:publications(title, slug)')
      .eq('room_code', code)
      .single();
    return (data as unknown as ClassroomWithHost) || null;
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
    return (data as unknown as ClassroomWithHost[]) || [];
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
      .select('room_code, title')
      .eq('host_id', authorId)
      .eq('visibility', 'public')
      .eq('status', 'live')
      .limit(1)
      .maybeSingle();
    return data || null;
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
