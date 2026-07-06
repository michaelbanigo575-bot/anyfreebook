'use client';

import { useState, useEffect } from 'react';

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
  { id: 'tech5', title: 'Tech Specialist', description: 'Read 5 technology books', target: 5, icon: '💻', category: 'Technology' },
  { id: 'sci5', title: 'Science Mind', description: 'Read 5 science books', target: 5, icon: '🔬', category: 'Sciences' },
  { id: 'biz5', title: 'Business Pro', description: 'Read 5 business books', target: 5, icon: '📊', category: 'Business' },
  { id: 'arts5', title: 'Arts Lover', description: 'Read 5 arts & humanities books', target: 5, icon: '🎨', category: 'Arts & Humanities' },
];

interface ChallengeProgress {
  booksRead: number;
  categoryBooks: Record<string, number>;
  completedChallenges: string[];
  streak: number;
  lastReadDate: string | null;
}

export function ReadingChallenge() {
  const [progress, setProgress] = useState<ChallengeProgress>({
    booksRead: 0,
    categoryBooks: {},
    completedChallenges: [],
    streak: 0,
    lastReadDate: null,
  });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('afb_reading_challenge');
    if (saved) setProgress(JSON.parse(saved));
  }, []);

  const getProgress = (challenge: Challenge): number => {
    if (challenge.category) {
      return progress.categoryBooks[challenge.category] || 0;
    }
    return progress.booksRead;
  };

  const isCompleted = (challenge: Challenge): boolean => {
    return progress.completedChallenges.includes(challenge.id);
  };

  const visibleChallenges = showAll ? CHALLENGES : CHALLENGES.slice(0, 6);
  const completedCount = progress.completedChallenges.length;

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

        {/* Streak */}
        {progress.streak > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {progress.streak} day reading streak!
            </span>
          </div>
        )}
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {visibleChallenges.map(challenge => {
          const current = getProgress(challenge);
          const completed = isCompleted(challenge);
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
