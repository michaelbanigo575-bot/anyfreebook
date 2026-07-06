'use client';

import { ReferralSystem } from '@/components/ReferralSystem';
import { ReadingChallenge } from '@/components/ReadingChallenge';
import { SavingsBadge } from '@/components/SavingsShareCard';

export default function RewardsPage() {
  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">
          Rewards & Referrals
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Share free books, complete challenges, and level up your reader profile.
        </p>
        <div className="mt-4">
          <SavingsBadge />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Referral system */}
        <div className="lg:col-span-2">
          <ReferralSystem />
        </div>

        {/* Reading challenges */}
        <div className="lg:col-span-2">
          <ReadingChallenge />
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6">
          <h3 className="text-lg font-bold text-[var(--text)] mb-4">🏆 Top Sharers This Month</h3>
          <div className="space-y-3">
            {[
              { name: 'Amara O.', referrals: 142, country: '🇳🇬', savings: '$4,260' },
              { name: 'James K.', referrals: 98, country: '🇰🇪', savings: '$2,940' },
              { name: 'Priya S.', referrals: 87, country: '🇮🇳', savings: '$2,610' },
              { name: 'Carlos M.', referrals: 73, country: '🇧🇷', savings: '$2,190' },
              { name: 'Sarah L.', referrals: 65, country: '🇺🇸', savings: '$1,950' },
            ].map((user, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="text-lg font-bold text-[var(--text-muted)] w-6">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-xs font-bold">
                  {user.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">{user.country} {user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{user.referrals} referrals · {user.savings} saved</p>
                </div>
                {i === 0 && <span className="text-xl">🥇</span>}
                {i === 1 && <span className="text-xl">🥈</span>}
                {i === 2 && <span className="text-xl">🥉</span>}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6">
          <h3 className="text-lg font-bold text-[var(--text)] mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Find free books', desc: 'Search 5M+ free books from Open Library, Gutenberg & Google Books' },
              { step: '2', title: 'Share with friends', desc: 'Use your referral link or share directly via WhatsApp, Twitter, LinkedIn' },
              { step: '3', title: 'Track your savings', desc: 'See how much money you and your friends have saved on books' },
              { step: '4', title: 'Level up', desc: 'Complete reading challenges and climb the referral tiers' },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{item.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
