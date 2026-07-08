'use client';

import { createClient } from '@/lib/supabase/client';

export interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  authorName: string;
}

/** Whether the current user has liked / saved a publication, and follows an author. */
export async function getInteractionState(publicationId: string, authorId: string): Promise<{
  liked: boolean;
  saved: boolean;
  following: boolean;
  signedIn: boolean;
}> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { liked: false, saved: false, following: false, signedIn: false };

  const [like, save, follow] = await Promise.all([
    sb.from('publication_likes').select('id').eq('publication_id', publicationId).eq('user_id', user.id).maybeSingle(),
    sb.from('publication_saves').select('id').eq('publication_id', publicationId).eq('user_id', user.id).maybeSingle(),
    authorId ? sb.from('author_follows').select('id').eq('author_id', authorId).eq('follower_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return { liked: !!like.data, saved: !!save.data, following: !!follow.data, signedIn: true };
}

export async function toggleLike(publicationId: string, currentlyLiked: boolean): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'sign-in-required' };
  if (currentlyLiked) {
    const { error } = await sb.from('publication_likes').delete().eq('publication_id', publicationId).eq('user_id', user.id);
    return { error: error?.message ?? null };
  }
  const { error } = await sb.from('publication_likes').insert({ publication_id: publicationId, user_id: user.id });
  return { error: error?.message ?? null };
}

export async function toggleSave(publicationId: string, currentlySaved: boolean): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'sign-in-required' };
  if (currentlySaved) {
    const { error } = await sb.from('publication_saves').delete().eq('publication_id', publicationId).eq('user_id', user.id);
    return { error: error?.message ?? null };
  }
  const { error } = await sb.from('publication_saves').insert({ publication_id: publicationId, user_id: user.id });
  return { error: error?.message ?? null };
}

export async function toggleFollow(authorId: string, currentlyFollowing: boolean): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'sign-in-required' };
  if (user.id === authorId) return { error: 'cannot-follow-self' };
  if (currentlyFollowing) {
    const { error } = await sb.from('author_follows').delete().eq('author_id', authorId).eq('follower_id', user.id);
    return { error: error?.message ?? null };
  }
  const { error } = await sb.from('author_follows').insert({ author_id: authorId, follower_id: user.id });
  return { error: error?.message ?? null };
}

export async function fetchComments(publicationId: string): Promise<Comment[]> {
  const sb = createClient();
  const { data } = await sb
    .from('publication_comments')
    .select('id, user_id, body, created_at, profiles!publication_comments_user_id_fkey(display_name)')
    .eq('publication_id', publicationId)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    user_id: c.user_id as string,
    body: c.body as string,
    created_at: c.created_at as string,
    authorName: ((c.profiles as { display_name?: string })?.display_name) || 'Reader',
  }));
}

export async function postComment(publicationId: string, body: string): Promise<{ error: string | null; comment?: Comment }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'sign-in-required' };
  const text = body.trim();
  if (!text) return { error: 'empty' };

  const { data, error } = await sb
    .from('publication_comments')
    .insert({ publication_id: publicationId, user_id: user.id, body: text })
    .select('id, user_id, body, created_at')
    .single();
  if (error) return { error: error.message };

  // Fetch display name for immediate render
  const { data: prof } = await sb.from('profiles').select('display_name').eq('id', user.id).single();
  return {
    error: null,
    comment: { id: data.id, user_id: data.user_id, body: data.body, created_at: data.created_at, authorName: prof?.display_name || 'You' },
  };
}

export async function deleteComment(id: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('publication_comments').delete().eq('id', id);
  return { error: error?.message ?? null };
}
