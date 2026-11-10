import type { InstitutionMember, InstitutionRole } from './client';

// Works with both the browser and server Supabase clients.
type SupabaseLike = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown }> };

interface MemberRow {
  id: string; institution_id: string; profile_id: string; role: InstitutionRole; joined_at: string;
  display_name: string | null; email: string | null; avatar_url: string | null;
}

/** Members with profile details. Emails are only returned to owners/admins/teachers (server-side check). */
export async function fetchMembersWithProfiles(
  sb: SupabaseLike,
  institutionId: string,
): Promise<InstitutionMember[]> {
  const { data } = await sb.rpc('institution_members_with_profiles', { p_institution: institutionId });
  return ((data as MemberRow[] | null) || []).map(r => ({
    id: r.id,
    institution_id: r.institution_id,
    profile_id: r.profile_id,
    role: r.role,
    joined_at: r.joined_at,
    profile: { display_name: r.display_name, email: r.email, avatar_url: r.avatar_url },
  }));
}

