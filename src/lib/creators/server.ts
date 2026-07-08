import { createClient, createServiceClient } from '@/lib/supabase/server';
import { DEFAULT_CONFIG, type ProgramConfig, type Publication, type CreatorProfile } from './types';

export async function getProgramConfig(): Promise<ProgramConfig> {
  try {
    const sb = createClient();
    const { data } = await sb.from('creator_program_config').select('*').eq('id', 1).single();
    return data ? {
      pool_percentage: Number(data.pool_percentage),
      platform_percentage: Number(data.platform_percentage),
      monthly_read_threshold: data.monthly_read_threshold,
      min_payout_usd: Number(data.min_payout_usd),
      estimated_rpm_usd: Number(data.estimated_rpm_usd),
    } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function getPublicationBySlug(slug: string): Promise<{ pub: Publication; author: CreatorProfile } | null> {
  try {
    const sb = createClient();
    const { data: pub } = await sb.from('publications').select('*').eq('slug', slug).eq('status', 'published').single();
    if (!pub) return null;
    const { data: author } = await sb
      .from('profiles')
      .select('id, display_name, creator_handle, creator_bio, creator_tier, avatar_url, creator_joined_at')
      .eq('id', pub.author_id)
      .single();
    return { pub: pub as Publication, author: (author as CreatorProfile) || null as never };
  } catch {
    return null;
  }
}

export async function getAuthorByHandle(handle: string): Promise<{ author: CreatorProfile; pubs: Publication[]; totalReads: number } | null> {
  try {
    const sb = createClient();
    const { data: author } = await sb
      .from('profiles')
      .select('id, display_name, creator_handle, creator_bio, creator_tier, avatar_url, creator_joined_at')
      .eq('creator_handle', handle)
      .single();
    if (!author) return null;
    const { data: pubs } = await sb
      .from('publications')
      .select('*')
      .eq('author_id', author.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    const list = (pubs as Publication[]) || [];
    const totalReads = list.reduce((a, p) => a + (p.read_count || 0), 0);
    return { author: author as CreatorProfile, pubs: list, totalReads };
  } catch {
    return null;
  }
}

/** Recently published works across all authors, for discovery. */
export async function getRecentPublications(limit = 12): Promise<(Publication & { authorName: string; authorHandle: string | null })[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('publications')
      .select('*, profiles!publications_author_id_fkey(display_name, creator_handle)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    return (data || []).map((p: Record<string, unknown>) => {
      const prof = (p.profiles as { display_name?: string; creator_handle?: string }) || {};
      return { ...(p as unknown as Publication), authorName: prof.display_name || 'Anonymous', authorHandle: prof.creator_handle || null };
    });
  } catch {
    return [];
  }
}

/** Dashboard stats for the signed-in creator (service client bypasses RLS for aggregates). */
export async function getCreatorDashboard(authorId: string): Promise<{
  pubs: Publication[];
  totalViews: number;
  totalReads: number;
  totalReadSeconds: number;
  verifiedReadsThisMonth: number;
}> {
  const sb = createServiceClient();
  const { data: pubs } = await sb.from('publications').select('*').eq('author_id', authorId).order('created_at', { ascending: false });
  const list = (pubs as Publication[]) || [];

  const pubIds = list.map(p => p.id);
  let verifiedReadsThisMonth = 0;
  if (pubIds.length > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    const { count } = await sb
      .from('publication_reads')
      .select('id', { count: 'exact', head: true })
      .in('publication_id', pubIds)
      .eq('verified', true)
      .gte('day', monthStart.toISOString().slice(0, 10));
    verifiedReadsThisMonth = count || 0;
  }

  return {
    pubs: list,
    totalViews: list.reduce((a, p) => a + (p.view_count || 0), 0),
    totalReads: list.reduce((a, p) => a + (p.read_count || 0), 0),
    totalReadSeconds: list.reduce((a, p) => a + (p.total_read_seconds || 0), 0),
    verifiedReadsThisMonth,
  };
}
