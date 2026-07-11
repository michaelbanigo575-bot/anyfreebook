'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toggleLike } from '@/lib/creators/social';
import { useAuth } from '@/components/AuthProvider';

/** One-tap like + comment shortcut on feed publication cards. */
export function FeedPubActions({ publicationId, slug, initialLikes, commentCount, viewCount }: {
  publicationId: string;
  slug: string;
  initialLikes: number;
  commentCount: number;
  viewCount: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);

  useEffect(() => {
    if (!user) return;
    createClient().from('publication_likes').select('id').eq('publication_id', publicationId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, publicationId]);

  const like = async () => {
    if (!user) { router.push(`/login?redirect=/feed`); return; }
    const next = !liked;
    setLiked(next); setLikes(n => n + (next ? 1 : -1));
    const { error } = await toggleLike(publicationId, liked);
    if (error) { setLiked(!next); setLikes(n => n + (next ? -1 : 1)); }
  };

  return (
    <div className="px-4 py-3 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        <button
          onClick={like}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${liked ? 'text-rose-500 bg-rose-500/10' : 'hover:bg-[var(--surface-hover)]'}`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          {liked ? '❤️' : '🤍'} {likes}
        </button>
        <Link href={`/read/${slug}#comments`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
          💬 {commentCount}
        </Link>
        <span className="px-2.5 py-1.5">📖 {viewCount} reads</span>
      </div>
      <Link href={`/read/${slug}`} className="text-xs font-bold text-[var(--primary)] hover:underline">Read free →</Link>
    </div>
  );
}
