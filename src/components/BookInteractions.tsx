'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface Interactions {
  liked: Set<string>;
  wishlisted: Set<string>;
  favorited: Set<string>;
}

const ACTION_MAP = { liked: 'liked', wishlisted: 'wishlisted', favorited: 'favorited' } as const;

function loadLocalInteractions(): Interactions {
  if (typeof window === 'undefined') return { liked: new Set(), wishlisted: new Set(), favorited: new Set() };
  try {
    const data = JSON.parse(localStorage.getItem('anyfreebook-interactions') || '{}');
    return {
      liked: new Set(data.liked || []),
      wishlisted: new Set(data.wishlisted || []),
      favorited: new Set(data.favorited || []),
    };
  } catch {
    return { liked: new Set(), wishlisted: new Set(), favorited: new Set() };
  }
}

function saveLocalInteractions(i: Interactions) {
  localStorage.setItem('anyfreebook-interactions', JSON.stringify({
    liked: Array.from(i.liked),
    wishlisted: Array.from(i.wishlisted),
    favorited: Array.from(i.favorited),
  }));
}

interface BookInteractionButtonsProps {
  bookId: string;
  likeCount: number;
  bookTitle?: string;
  bookAuthor?: string;
  bookSlug?: string;
}

export function BookInteractionButtons({ bookId, likeCount, bookTitle, bookAuthor, bookSlug }: BookInteractionButtonsProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [interactions, setInteractions] = useState<Interactions>({ liked: new Set(), wishlisted: new Set(), favorited: new Set() });
  const [animating, setAnimating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setInteractions(loadLocalInteractions());
      return;
    }
    supabase
      .from('book_interactions')
      .select('action')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .then(({ data }) => {
        const actions = new Set((data || []).map(r => r.action));
        setInteractions({
          liked: new Set(actions.has('liked') ? [bookId] : []),
          wishlisted: new Set(actions.has('wishlisted') ? [bookId] : []),
          favorited: new Set(actions.has('favorited') ? [bookId] : []),
        });
      });
  }, [user, bookId, supabase]);

  const toggle = useCallback(async (type: keyof Interactions) => {
    const action = ACTION_MAP[type];
    const isActive = interactions[type].has(bookId);

    if (!isActive) {
      setAnimating(type);
      setTimeout(() => setAnimating(null), 600);
    }

    setInteractions(prev => {
      const next = { liked: new Set(prev.liked), wishlisted: new Set(prev.wishlisted), favorited: new Set(prev.favorited) };
      if (next[type].has(bookId)) next[type].delete(bookId); else next[type].add(bookId);
      if (!user) saveLocalInteractions(next);
      return next;
    });

    if (user) {
      if (isActive) {
        await supabase.from('book_interactions').delete()
          .eq('user_id', user.id).eq('book_id', bookId).eq('action', action);
      } else {
        await supabase.from('book_interactions').insert({
          user_id: user.id,
          book_id: bookId,
          book_title: bookTitle,
          book_author: bookAuthor,
          book_slug: bookSlug,
          action,
        });
      }
    }
  }, [interactions, bookId, user, supabase, bookTitle, bookAuthor, bookSlug]);

  const isLiked = interactions.liked.has(bookId);
  const isWishlisted = interactions.wishlisted.has(bookId);
  const isFavorited = interactions.favorited.has(bookId);

  return (
    <div className="flex items-center gap-2">
      {/* Like */}
      <button
        onClick={() => toggle('liked')}
        className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${
          isLiked
            ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400'
            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-red-300 hover:text-red-500'
        } ${animating === 'liked' ? 'animate-scale-in' : ''}`}
        title={isLiked ? 'Unlike' : 'Like'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span className="text-sm font-medium">{isLiked ? likeCount + 1 : likeCount}</span>
      </button>

      {/* Wishlist */}
      <button
        onClick={() => toggle('wishlisted')}
        className={`group p-2 rounded-xl border transition-all duration-300 ${
          isWishlisted
            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400'
            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-blue-300 hover:text-blue-500'
        } ${animating === 'wishlisted' ? 'animate-scale-in' : ''}`}
        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill={isWishlisted ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Favorite */}
      <button
        onClick={() => toggle('favorited')}
        className={`group p-2 rounded-xl border transition-all duration-300 ${
          isFavorited
            ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-amber-300 hover:text-amber-500'
        } ${animating === 'favorited' ? 'animate-scale-in' : ''}`}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill={isFavorited ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    </div>
  );
}
