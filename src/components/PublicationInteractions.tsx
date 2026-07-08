'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getInteractionState, toggleLike, toggleSave } from '@/lib/creators/social';

export function PublicationInteractions({
  publicationId,
  authorId,
  initialLikes,
  initialSaves,
  commentCount,
  title,
}: {
  publicationId: string;
  authorId: string;
  initialLikes: number;
  initialSaves: number;
  commentCount: number;
  title: string;
}) {
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [saves, setSaves] = useState(initialSaves);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getInteractionState(publicationId, authorId).then(s => {
      setLiked(s.liked); setSaved(s.saved); setSignedIn(s.signedIn);
    });
  }, [publicationId, authorId]);

  const requireAuth = () => { router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); };

  const onLike = async () => {
    if (!signedIn) return requireAuth();
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next); setLikes(l => l + (next ? 1 : -1));
    const { error } = await toggleLike(publicationId, liked);
    if (error) { setLiked(!next); setLikes(l => l + (next ? -1 : 1)); }
    setBusy(false);
  };

  const onSave = async () => {
    if (!signedIn) return requireAuth();
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); setSaves(s => s + (next ? 1 : -1));
    const { error } = await toggleSave(publicationId, saved);
    if (error) { setSaved(!next); setSaves(s => s + (next ? -1 : 1)); }
    setBusy(false);
  };

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex items-center gap-2 py-3 my-6 border-y border-[var(--border-subtle)]">
      <button
        onClick={onLike}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${liked ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        {likes.toLocaleString()}
      </button>

      <button
        onClick={scrollToComments}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        {commentCount.toLocaleString()}
      </button>

      <button
        onClick={onSave}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${saved ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        {saved ? 'Saved' : 'Save'}
      </button>

      <div className="flex-1" />

      <button
        onClick={onShare}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
        {copied ? 'Copied!' : 'Share'}
      </button>
    </div>
  );
}
