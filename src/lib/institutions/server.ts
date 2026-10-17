import { createClient } from '@/lib/supabase/server';
import type { Institution, InstitutionRole } from './client';

export async function listInstitutions(limit = 60): Promise<Institution[]> {
  try {
    const sb = createClient();
    const { data } = await sb.from('institutions').select('*').order('member_count', { ascending: false }).limit(limit);
    return (data as Institution[]) || [];
  } catch {
    return [];
  }
}

export async function getInstitutionById(id: string): Promise<Institution | null> {
  try {
    const sb = createClient();
    const { data } = await sb.from('institutions').select('*').eq('id', id).single();
    return (data as Institution) || null;
  } catch {
    return null;
  }
}

export async function getInstitutionBySlug(slug: string): Promise<Institution | null> {
  try {
    const sb = createClient();
    const { data } = await sb.from('institutions').select('*').eq('slug', slug).single();
    return (data as Institution) || null;
  } catch {
    return null;
  }
}

export async function getMyRole(institutionId: string, userId: string | null | undefined): Promise<InstitutionRole | null> {
  if (!userId) return null;
  try {
    const sb = createClient();
    const { data } = await sb.from('institution_members').select('role').eq('institution_id', institutionId).eq('profile_id', userId).maybeSingle();
    return (data?.role as InstitutionRole) || null;
  } catch {
    return null;
  }
}

export interface InstitutionPublication {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  category: string;
  content_type: string;
  status: string;
  view_count: number;
  read_count: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  published_at: string | null;
  created_at: string;
}

export async function getInstitutionPublications(institutionId: string): Promise<InstitutionPublication[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('publications')
      .select('id, slug, title, cover_url, category, content_type, status, view_count, read_count, like_count, comment_count, save_count, published_at, created_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });
    return (data as InstitutionPublication[]) || [];
  } catch {
    return [];
  }
}

export interface InstitutionClassroom {
  id: string;
  title: string;
  room_code: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduled_at: string;
  peak_attendance: number;
  recording_url: string | null;
}

export async function getInstitutionClassrooms(institutionId: string): Promise<InstitutionClassroom[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('classrooms')
      .select('id, title, room_code, status, scheduled_at, peak_attendance, recording_url')
      .eq('institution_id', institutionId)
      .order('scheduled_at', { ascending: false });
    return (data as InstitutionClassroom[]) || [];
  } catch {
    return [];
  }
}

export interface InstitutionComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  commenter?: { display_name: string | null } | null;
  publication?: { title: string; slug: string } | null;
}

/** Recent comments across all of an institution's publications, for the community/moderation feed. */
export async function getInstitutionComments(institutionId: string, limit = 30): Promise<InstitutionComment[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('publication_comments')
      .select('id, body, created_at, user_id, commenter:profiles(display_name), publication:publications!inner(title, slug, institution_id)')
      .eq('publication.institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as unknown as InstitutionComment[]) || [];
  } catch {
    return [];
  }
}
