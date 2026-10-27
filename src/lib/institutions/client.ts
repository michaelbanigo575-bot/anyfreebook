'use client';

import { createClient } from '@/lib/supabase/client';

export interface Institution {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  type: 'school' | 'university' | 'library' | 'ngo' | 'other';
  description: string | null;
  logo_url: string | null;
  website: string | null;
  country: string | null;
  verified: boolean;
  member_count: number;
  created_at: string;
}

export type InstitutionRole = 'owner' | 'admin' | 'teacher' | 'student';

export interface InstitutionMember {
  id: string;
  institution_id: string;
  profile_id: string;
  role: InstitutionRole;
  joined_at: string;
  profile?: { display_name: string | null; email: string | null; avatar_url: string | null } | null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
}

function randomToken(len: number): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createInstitution(input: {
  name: string;
  type: Institution['type'];
  description?: string;
  website?: string;
  country?: string;
}): Promise<{ error: string | null; slug?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  if (!input.name.trim()) return { error: 'Give your institution a name' };

  let slug = slugify(input.name) || `institution-${user.id.slice(0, 6)}`;
  const { data: existing } = await sb.from('institutions').select('id').eq('slug', slug).maybeSingle();
  if (existing) slug = `${slug}-${user.id.slice(0, 4)}`;

  const { error } = await sb.from('institutions').insert({
    owner_id: user.id,
    name: input.name.trim(),
    slug,
    type: input.type,
    description: input.description || null,
    website: input.website || null,
    country: input.country || null,
  });

  if (error) return { error: error.message };
  return { error: null, slug };
}

export async function updateInstitution(id: string, patch: Partial<Pick<Institution, 'name' | 'description' | 'logo_url' | 'website' | 'country' | 'type'>>): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('institutions').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function listMyInstitutions(): Promise<(InstitutionMember & { institution: Institution })[]> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb
    .from('institution_members')
    .select('*, institution:institutions(*)')
    .eq('profile_id', user.id)
    .order('joined_at', { ascending: false });
  return (data as unknown as (InstitutionMember & { institution: Institution })[]) || [];
}

export async function getMembers(institutionId: string): Promise<InstitutionMember[]> {
  const sb = createClient();
  const { data } = await sb
    .from('institution_members')
    .select('*, profile:profiles(display_name, email, avatar_url)')
    .eq('institution_id', institutionId)
    .order('joined_at', { ascending: true });
  return (data as unknown as InstitutionMember[]) || [];
}

export async function updateMemberRole(institutionId: string, profileId: string, role: InstitutionRole): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('institution_members').update({ role }).eq('institution_id', institutionId).eq('profile_id', profileId);
  return { error: error?.message ?? null };
}

export async function removeMember(institutionId: string, profileId: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('institution_members').delete().eq('institution_id', institutionId).eq('profile_id', profileId);
  return { error: error?.message ?? null };
}

/**
 * Join an institution without an invite.
 *
 * A reader who finds a school or library on the site should be able to be part
 * of it: follow it, get its study plans and see its members. The RLS policy
 * "admins add members" already permits `auth.uid() = profile_id`, so a
 * signed-in user may insert their own membership row. The role is always
 * 'student' — self-joining never grants owner or admin, which is what the
 * "admins add members" policy is about.
 */
export async function joinInstitution(institutionId: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Sign in to join' };

  // Never upsert: an upsert on an existing row would UPDATE it, and a
  // self-join must not demote someone who is already an owner or admin.
  const { data: existing } = await sb
    .from('institution_members')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (existing) return { error: null };

  const { error } = await sb.from('institution_members').insert({
    institution_id: institutionId,
    profile_id: user.id,
    role: 'student',
  });
  return { error: error?.message ?? null };
}

/** Leave an institution. The RLS policy "admins or self remove members" allows this. */
export async function leaveInstitution(institutionId: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Sign in first' };

  // The owner is the institution's only route to an admin, so leaving would
  // orphan it. Say so rather than silently stranding the institution.
  const { data: mine } = await sb
    .from('institution_members')
    .select('role')
    .eq('institution_id', institutionId)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (mine?.role === 'owner') {
    return { error: 'Transfer ownership to an admin before leaving' };
  }

  const { error } = await sb
    .from('institution_members')
    .delete()
    .eq('institution_id', institutionId)
    .eq('profile_id', user.id);
  return { error: error?.message ?? null };
}

/** The signed-in user's membership of one institution, or null if they are not a member. */
export async function getMyMembership(institutionId: string): Promise<InstitutionMember | null> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from('institution_members')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('profile_id', user.id)
    .maybeSingle();
  return (data as unknown as InstitutionMember) || null;
}

export async function createInvite(institutionId: string, role: 'admin' | 'teacher' | 'student'): Promise<{ error: string | null; token?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const token = randomToken(16);
  const { error } = await sb.from('institution_invites').insert({
    institution_id: institutionId,
    token,
    role,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  return { error: null, token };
}

/** Self-serve join: current user redeems an invite token and becomes a member with its role. */
export async function joinViaInvite(token: string): Promise<{ error: string | null; institutionSlug?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Sign in first' };

  const { data: invite } = await sb.from('institution_invites').select('institution_id, role, expires_at').eq('token', token).maybeSingle();
  if (!invite) return { error: 'Invite link is invalid or has expired' };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { error: 'This invite link has expired' };

  const { error } = await sb.from('institution_members').upsert({
    institution_id: invite.institution_id,
    profile_id: user.id,
    role: invite.role,
  }, { onConflict: 'institution_id,profile_id', ignoreDuplicates: true });
  if (error) return { error: error.message };

  const { data: institution } = await sb.from('institutions').select('slug').eq('id', invite.institution_id).single();
  return { error: null, institutionSlug: institution?.slug };
}

export interface StudyPlanTemplate {
  id: string;
  institution_id: string;
  title: string;
  goal_books_per_week: number;
  focus_category: string | null;
  created_by: string;
  created_at: string;
}

export async function createStudyPlanTemplate(institutionId: string, input: { title: string; goalBooksPerWeek: number; focusCategory?: string }): Promise<{ error: string | null; id?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  const { data, error } = await sb.from('study_plan_templates').insert({
    institution_id: institutionId,
    title: input.title.trim(),
    goal_books_per_week: input.goalBooksPerWeek,
    focus_category: input.focusCategory || null,
    created_by: user.id,
  }).select('id').single();
  if (error) return { error: error.message };
  return { error: null, id: data?.id };
}

export async function listStudyPlanTemplates(institutionId: string): Promise<StudyPlanTemplate[]> {
  const sb = createClient();
  const { data } = await sb.from('study_plan_templates').select('*').eq('institution_id', institutionId).order('created_at', { ascending: false });
  return (data as StudyPlanTemplate[]) || [];
}

/** Pushes a template's goal/category onto each selected student's own study_plans row (one-time copy, not a live sync). Requires the caller to be institution staff — enforced server-side. */
export async function assignStudyPlan(templateId: string, studentIds: string[]): Promise<{ error: string | null; assigned?: number }> {
  const sb = createClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { error: 'Not signed in' };

  const res = await fetch('/api/institutions/assign-study-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, studentIds }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: json.error || 'Assignment failed' };
  return { error: null, assigned: json.assigned };
}
