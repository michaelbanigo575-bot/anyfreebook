'use client';

import { createClient } from '@/lib/supabase/client';

export interface FeedPost {
  id: string;
  author_id: string;
  post_type: 'article' | 'video' | 'file';
  title: string;
  body: string | null;
  video_url: string | null;
  file_url: string | null;
  cover_url: string | null;
  category: string;
  status: 'draft' | 'published' | 'removed';
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  published_at: string | null;
  author?: { display_name: string | null; creator_handle: string | null; avatar_url: string | null };
}

export async function createFeedPost(input: {
  postType: 'article' | 'video' | 'file';
  title: string;
  body?: string;
  videoUrl?: string;
  fileUrl?: string;
  coverUrl?: string;
  category?: string;
}): Promise<{ error: string | null; id?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  if (!input.title.trim()) return { error: 'Title is required' };

  const { data, error } = await sb.from('feed_posts').insert({
    author_id: user.id,
    post_type: input.postType,
    title: input.title.trim(),
    body: input.body || null,
    video_url: input.videoUrl || null,
    file_url: input.fileUrl || null,
    cover_url: input.coverUrl || null,
    category: input.category || 'General',
    status: 'published',
    published_at: new Date().toISOString(),
  }).select('id').single();

  if (error) return { error: error.message };
  return { error: null, id: data?.id };
}

export async function deleteFeedPost(id: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('feed_posts').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function listMyFeedPosts(): Promise<FeedPost[]> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from('feed_posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false });
  return (data as FeedPost[]) || [];
}
