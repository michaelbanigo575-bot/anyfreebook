'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toggleFollow } from '@/lib/creators/social';

export function FollowButton({
  authorId,
  initialFollowers,
  size = 'md',
}: {
  authorId: string;
  initialFollowers: number;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(initialFollowers);
  const [ready, setReady] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setReady(true); return; }
      if (user.id === authorId) { setIsSelf(true); setReady(true); return; }
      const { data } = await sb.from('author_follows').select('id').eq('author_id', authorId).eq('follower_id', user.id).maybeSingle();
      setFollowing(!!data);
      setReady(true);
    });
  }, [authorId]);

  const onClick = async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); setFollowers(f => f + (next ? 1 : -1));
    const { error } = await toggleFollow(authorId, following);
    if (error) { setFollowing(!next); setFollowers(f => f + (next ? -1 : 1)); }
    setBusy(false);
  };

  if (isSelf) return null;

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2 text-sm';

  return (
    <button
      onClick={onClick}
      disabled={!ready || busy}
      className={`${pad} rounded-full font-semibold transition-all disabled:opacity-60 ${
        following
          ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'
          : 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:shadow-md'
      }`}
    >
      {following ? 'Following' : '+ Follow'}
    </button>
  );
}
