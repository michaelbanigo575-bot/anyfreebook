'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  icon: string;
  category?: string;
}

const CHALLENGES: Challenge[] = [
  { id: 'starter', title: 'First Steps', description: 'Read your first free book', target: 1, icon: '🌱' },
  { id: 'explorer', title: 'Explorer', description: 'Read 5 books from different sources', target: 5, icon: '🧭' },
  { id: 'bookworm', title: 'Bookworm', description: 'Read 10 free books', target: 10, icon: '🐛' },
  { id: 'scholar', title: 'Scholar', description: 'Read 25 books this year', target: 25, icon: '🎓' },
  { id: 'bibliophile', title: 'Bibliophile', description: 'Read 50 books', target: 50, icon: '📖' },
  { id: 'legend', title: 'Library Legend', description: 'Read 100 books', target: 100, icon: '👑' },
  { id: 'liked10', title: 'Curator', description: 'Like 10 books you enjoyed', target: 10, icon: '❤️' },
  { id: 'wishlist5', title: 'Planner', description: 'Wishlist 5 books to read next', target: 5, icon: '📌' },
  { id: 'faves5', title: 'Collector', description: 'Favorite 5 all-time greats', target: 5, icon: '⭐' },
  { id: 'allround', title: 'All-Rounder', description: 'Read, like, wishlist and favorite at least one book each', target: 4, icon: '🏆' },
];

interface Counts {
  read: number;
  liked: number;
  wishlisted: number;
  favorited: number;
}

function getChallengeProgress(c: Challenge, counts: Counts): number {
  switch (c.id) {
    case 'liked10': return counts.liked;
    case 'wishlist5': return counts.wishlisted;
    case 'faves5': return counts.favorited;
    case 'allround':
      return [counts.read, counts.liked, counts.wishlisted, counts.favorited].filter(n => n > 0).length;
    default: return counts.read;
  }
}

export function ReadingChallenge() {
  const { user, loading } = useAuth();
  const supabase = createClient();
  const [counts, setCounts] = useState<Counts>({ read: 0, liked: 0, wishlisted: 0, favorited: 0 });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('book_interactions')
        .select('action')
        .eq('user_id', user.id)
        .then(({ data }) => {
          const rows = data || [];
          setCounts({
            read: rows.filter(r => r.action === 'read').length,
            liked: rows.filter(r => r.action === 'liked').length,
            wishlisted: rows.filter(r => r.action === 'wishlisted').length,
            favorited: rows.filter(r => r.action === 'favorited').length,
          });
        });
    } else {
      // Guest fallback: approximate from the legacy localStorage tracker
      const saved = localStorage.getItem('afb_reading_challenge');
      if (saved) {
        try {
          const p = JSON.parse(saved);
          setCounts(c => ({ ...c, read: p.booksRead || 0 }));
        } catch {}
      }
    }
  }, [user, supabase]);

  const completedCount = CHALLENGES.filter(c => getChallengeProgress(c, counts) >= c.target).length;
  const visibleChallenges = showAll ? CHALLENGES : CHALLENGES.slice(0, 6);

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--text)]">📚 Reading Challenges</h3>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Complete challenges by reading free books
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">{completedCount}/{CHALLENGES.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Completed</p>
          </div>
        </div>

        {!loading && !user && (
          <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--primary-light)] border border-[var(--primary)]/20">
            <span className="text-xs text-[var(--text-secondary)]">
              Sign in so your progress counts on every device
            </span>
            <a href="/login" className="text-xs font-semibold text-[var(--primary)] whitespace-nowrap hover:underline">
              Sign in →
            </a>
          </div>
        )}
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {visibleChallenges.map(challenge => {
          const current = getChallengeProgress(challenge, counts);
          const completed = current >= challenge.target;
          const pct = Math.min((current / challenge.target) * 100, 100);

          return (
            <div key={challenge.id} className={`px-6 py-4 flex items-center gap-4 ${completed ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
              <div className="text-2xl flex-shrink-0">{challenge.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text)]">{challenge.title}</h4>
                  {completed && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">DONE</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{challenge.description}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-secondary)]">
                    <div
                      className={`h-full rounded-full transition-all ${completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                    {current}/{challenge.target}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-hover)] transition-colors border-t border-[var(--border-subtle)]"
        >
          Show all {CHALLENGES.length} challenges →
        </button>
      )}
    </div>
  );
}
