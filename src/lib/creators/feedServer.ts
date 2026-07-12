import { createClient } from '@/lib/supabase/server';
import type { FeedPost } from './feed';
import { autoEndStale, isStaleLive, type ClassroomWithHost } from '@/lib/classrooms/server';

export async function getFeedPosts(limit = 20, offset = 0): Promise<FeedPost[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('feed_posts')
      .select('*, author:profiles!feed_posts_author_id_fkey(display_name, creator_handle, avatar_url)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data as unknown as FeedPost[]) || [];
  } catch {
    return [];
  }
}

export interface FeedPublication {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  publication_type: string | null;
  cover_url: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  author?: { display_name: string | null; creator_handle: string | null } | null;
}

/** Recently published works by authors — they flow into the feed alongside posts. */
export async function getFeedPublications(limit = 20): Promise<FeedPublication[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('publications')
      .select('id, title, slug, description, publication_type, cover_url, view_count, like_count, comment_count, published_at, author:profiles!publications_author_id_fkey(display_name, creator_handle)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);
    return (data as unknown as FeedPublication[]) || [];
  } catch {
    return [];
  }
}

/** Public classrooms that are live right now — pinned at the top of the feed. */
export async function getLivePublicClassrooms(): Promise<ClassroomWithHost[]> {
  try {
    const sb = createClient();
    const { data } = await sb
      .from('classrooms')
      .select('*, host:profiles!classrooms_host_id_fkey(display_name, creator_handle), publication:publications(title, slug)')
      .eq('visibility', 'public')
      .eq('status', 'live')
      .order('started_at', { ascending: false })
      .limit(6);
    const rooms = (data as unknown as ClassroomWithHost[]) || [];
    autoEndStale(rooms);
    return rooms.filter(c => !isStaleLive(c));
  } catch {
    return [];
  }
}

/** Public classrooms starting within the next 48h — shown as a strip under the live banner. */
export async function getSoonPublicClassrooms(): Promise<ClassroomWithHost[]> {
  try {
    const sb = createClient();
    const now = new Date().toISOString();
    const horizon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data } = await sb
      .from('classrooms')
      .select('*, host:profiles!classrooms_host_id_fkey(display_name, creator_handle), publication:publications(title, slug)')
      .eq('visibility', 'public')
      .eq('status', 'scheduled')
      .gte('scheduled_at', now)
      .lte('scheduled_at', horizon)
      .order('scheduled_at', { ascending: true })
      .limit(4);
    return (data as unknown as ClassroomWithHost[]) || [];
  } catch {
    return [];
  }
}

export type FeedItem =
  | { kind: 'post'; ts: string; post: FeedPost }
  | { kind: 'publication'; ts: string; publication: FeedPublication };

/** The unified feed: author posts + newly published works, merged newest-first. */
export async function getUnifiedFeed(limit = 30): Promise<{
  live: ClassroomWithHost[];
  soon: ClassroomWithHost[];
  items: FeedItem[];
}> {
  const [posts, pubs, live, soon] = await Promise.all([
    getFeedPosts(limit),
    getFeedPublications(limit),
    getLivePublicClassrooms(),
    getSoonPublicClassrooms(),
  ]);

  const items: FeedItem[] = [
    ...posts.map(p => ({ kind: 'post' as const, ts: p.published_at || '', post: p })),
    ...pubs.map(p => ({ kind: 'publication' as const, ts: p.published_at || '', publication: p })),
  ]
    .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
    .slice(0, limit);

  return { live, soon, items };
}
