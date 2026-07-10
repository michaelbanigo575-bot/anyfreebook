import { createClient } from '@/lib/supabase/server';
import type { FeedPost } from './feed';

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
