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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (cancelled) return;
        if (!user) { setReady(true); return; }
        if (user.id === authorId) { setIsSelf(true); setReady(true); return; }
        const { data } = await sb.from('author_follows').select('id').eq('author_id', authorId).eq('follower_id', user.id).maybeSingle();
        if (cancelled) return;
        setFollowing(!!data);
        setReady(true);
      } catch {
        if (cancelled) return;
        // Never leave the button permanently disabled: enable it and let the
        // user retry loading the follow state.
        setReady(true);
        setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [authorId, reloadKey]);

  const onClick = async () => {
    // Lock BEFORE the first await, otherwise two quick clicks both toggle.
    if (busy) return;
    setBusy(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(false); router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    const next = !following;
    setFollowing(next); setFollowers(f => f + (next ? 1 : -1));
    const { error } = await toggleFollow(authorId, following);
    if (error) { setFollowing(!next); setFollowers(f => f + (next ? -1 : 1)); }
    setBusy(false);
  };

  if (isSelf) return null;

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2 text-sm';

  return (
    <span className="inline-flex items-center gap-2">
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
      {loadError && (
        <span className="text-[11px] text-[var(--text-muted)]">
          Couldn&apos;t load follow status.{' '}
          <button onClick={() => setReloadKey(k => k + 1)} className="underline">Retry</button>
        </span>
      )}
    </span>
  );
}
