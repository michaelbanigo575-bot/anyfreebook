'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toggleSave } from '@/lib/creators/social';
import { useAuth } from '@/components/AuthProvider';
import { Icon, type IconName } from '@/components/icons';
import { FocusPopup, ShareButton } from '@/components/ShareSheet';

const REACTIONS: { id: string; label: string; icon: IconName; badge: string }[] = [
  { id: 'love', label: 'Love', icon: 'heart', badge: 'from-[#FF7A90] to-[#C51F4A]' },
  { id: 'insightful', label: 'Insightful', icon: 'bulb', badge: 'from-[#FFD66B] to-[#B87605]' },
  { id: 'brilliant', label: 'Brilliant', icon: 'sparkles', badge: 'from-[#6EC1EA] to-[#00628C]' },
  { id: 'enjoyed', label: 'Enjoyed', icon: 'smile', badge: 'from-[#B79CFF] to-[#5A3BC2]' },
  { id: 'helpful', label: 'Helpful', icon: 'thumb', badge: 'from-[#4FD1AB] to-[#067A5B]' },
];

function Badge({ r, size }: { r: (typeof REACTIONS)[number]; size: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'w-12 h-12' : 'w-6 h-6';
  return (
    <span className={`${box} rounded-full bg-gradient-to-br ${r.badge} text-white flex items-center justify-center ring-2 ring-white/90 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_5px_12px_rgba(5,15,38,0.28)]`}>
      <Icon name={r.icon} size={size === 'lg' ? 24 : 13} filled={r.icon === 'heart'} />
    </span>
  );
}

const action = 'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[52px] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors select-none';

/** Reactions, comments, save and share. Tap React for Love; hold it (or use the arrow) to choose. */
export function FeedPubActions({ publicationId, slug, title, initialLikes, commentCount, viewCount }: {
  publicationId: string;
  slug: string;
  title: string;
  initialLikes: number;
  commentCount: number;
  viewCount: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [mine, setMine] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [total, setTotal] = useState(initialLikes);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [canChoose, setCanChoose] = useState(false);
  const busy = useRef(false);
  const hold = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);

  useEffect(() => {
    if (!user) { setMine(null); setSaved(false); return; }
    let live = true;
    const sb = createClient();
    (async () => {
      // The reaction column arrives with a database script; until then there is only Love
      const typed = await sb.from('publication_likes').select('reaction').eq('publication_id', publicationId).eq('user_id', user.id).maybeSingle();
      if (!live) return;
      if (typed.error) {
        const plain = await sb.from('publication_likes').select('id').eq('publication_id', publicationId).eq('user_id', user.id).maybeSingle();
        if (live) setMine(plain.data ? 'love' : null);
      } else {
        setCanChoose(true);
        setMine((typed.data as { reaction: string } | null)?.reaction ?? null);
      }
    })();
    sb.from('publication_saves').select('id').eq('publication_id', publicationId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (live) setSaved(!!data); });
    return () => { live = false; clearTimeout(hold.current); };
  }, [user, publicationId]);

  const signIn = () => router.push('/login?redirect=/feed');

  const react = async (next: string | null) => {
    setPicking(false);
    if (!user) { signIn(); return; }
    if (busy.current || next === mine) return;
    busy.current = true;
    setError('');
    const before = mine, beforeTotal = total;
    setMine(next);
    setTotal(beforeTotal + (before ? -1 : 0) + (next ? 1 : 0));
    const sb = createClient();
    let failed = false;
    if (before) {
      const { error: e } = await sb.from('publication_likes').delete().eq('publication_id', publicationId).eq('user_id', user.id);
      failed = !!e;
    }
    if (next && !failed) {
      const row: Record<string, string> = { publication_id: publicationId, user_id: user.id };
      if (canChoose) row.reaction = next;
      const { error: e } = await sb.from('publication_likes').insert(row);
      failed = !!e;
    }
    if (failed) { setMine(before); setTotal(beforeTotal); setError('Could not save your reaction. Try again.'); }
    busy.current = false;
  };

  const save = async () => {
    if (!user) { signIn(); return; }
    const next = !saved;
    setSaved(next); setError('');
    const { error: e } = await toggleSave(publicationId, saved);
    if (e) { setSaved(!next); setError('Could not save. Try again.'); }
  };

  const current = REACTIONS.find(r => r.id === mine);
  const startHold = () => {
    held.current = false;
    if (!canChoose) return;
    hold.current = setTimeout(() => { held.current = true; setPicking(true); }, 450);
  };
  const stopHold = () => clearTimeout(hold.current);

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-2 px-1 py-2 text-xs text-[var(--text-muted)]">
        {current && <Badge r={current} size="sm" />}
        <span>{total} {total === 1 ? 'reaction' : 'reactions'}</span>
        <span className="ml-auto">{commentCount} comments · {viewCount} reads</span>
      </div>
      <div className="grid grid-cols-4 gap-1 border-t border-[var(--border-subtle)] pt-1">
        <div className="relative">
          <button
            type="button"
            className={`${action} w-full ${current ? '!text-[var(--primary)]' : ''}`}
            aria-pressed={!!mine}
            onPointerDown={startHold} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}
            onContextMenu={e => e.preventDefault()}
            onClick={() => { if (held.current) { held.current = false; return; } react(mine ? null : 'love'); }}
          >
            {current ? <Badge r={current} size="sm" /> : <Icon name="heart" />}
            {current ? current.label : 'React'}
          </button>
          {canChoose && (
            <button type="button" onClick={() => setPicking(true)} aria-label="Choose a reaction" className="absolute right-0 top-0 w-7 h-7 text-[var(--text-muted)]">▴</button>
          )}
        </div>
        <Link href={`/read/${slug}#comments`} className={action}><Icon name="comment" />Comment</Link>
        <button type="button" onClick={save} aria-pressed={saved} className={`${action} ${saved ? '!text-[var(--primary)]' : ''}`}>
          <Icon name="bookmark" filled={saved} />{saved ? 'Saved' : 'Save'}
        </button>
        <ShareButton path={`/read/${slug}`} title={title} className={action}><Icon name="share" />Share</ShareButton>
      </div>
      {error && <p role="alert" className="px-1 py-1 text-xs text-red-600">{error}</p>}
      {picking && (
        <FocusPopup label="Choose a reaction" onClose={() => setPicking(false)}>
          <div className="flex justify-between gap-1">
            {REACTIONS.map(r => (
              <button key={r.id} type="button" onClick={() => react(r.id)} aria-pressed={mine === r.id} className="flex flex-col items-center gap-2 py-2 flex-1 rounded-2xl text-[11px] font-semibold text-[var(--text)] transition-transform hover:-translate-y-1.5 active:scale-95">
                <Badge r={r} size="lg" />{r.label}
              </button>
            ))}
          </div>
        </FocusPopup>
      )}
    </div>
  );
}
