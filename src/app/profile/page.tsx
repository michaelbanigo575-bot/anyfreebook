'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { ActivityTimeline } from '@/components/ActivityTimeline';

type Tab = 'activity' | 'wishlist' | 'favorites' | 'history' | 'stats';

interface StoredInteraction {
  book_id: string;
  book_title: string | null;
  book_author: string | null;
  book_slug: string | null;
  action: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const [interactions, setInteractions] = useState<StoredInteraction[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('book_interactions')
      .select('book_id, book_title, book_author, book_slug, action')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setInteractions(data || []));
  }, [user, supabase]);

  if (loading || !user) {
    return (
      <div className="content-wrapper py-20 text-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  const wishlisted = interactions.filter(i => i.action === 'wishlisted');
  const favorited = interactions.filter(i => i.action === 'favorited');
  const liked = interactions.filter(i => i.action === 'liked');

  const tabs: { id: Tab; label: string; icon: string; count: number }[] = [
    { id: 'activity', label: 'Activity', icon: '🕓', count: 0 },
    { id: 'wishlist', label: 'Wishlist', icon: '📚', count: wishlisted.length },
    { id: 'favorites', label: 'Favorites', icon: '⭐', count: favorited.length },
    { id: 'history', label: 'Liked', icon: '❤️', count: liked.length },
    { id: 'stats', label: 'Stats', icon: '📊', count: 0 },
  ];

  const currentBooks = activeTab === 'wishlist' ? wishlisted : activeTab === 'favorites' ? favorited : liked;

  const referralLink = profile?.referral_code
    ? `https://anyfreebook.com/login?ref=${profile.referral_code}`
    : null;

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Reader';

  return (
    <div className="content-wrapper py-8">
      {/* Profile header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-[var(--text)]">{displayName}</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {liked.length} liked &middot; {wishlisted.length} wishlisted &middot; {favorited.length} favorites
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Publish & Earn — the creator entry point lives here once signed in */}
      <a
        href={profile?.is_creator ? '/creators/dashboard' : '/creators'}
        className="block mb-4 p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between gap-4 flex-wrap hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        <div>
          <p className="text-sm font-bold">{profile?.is_creator ? '✍️ Your Creator Studio' : '💸 Publish & Earn'}</p>
          <p className="text-xs text-white/80 mt-0.5">
            {profile?.is_creator
              ? 'Manage your works, host classes, track reads and earnings'
              : 'Publish your books and notes free — earn from every verified read'}
          </p>
        </div>
        <span className="px-4 py-2 rounded-lg bg-white/20 text-sm font-semibold flex-shrink-0">
          {profile?.is_creator ? 'Open studio →' : 'Get started →'}
        </span>
      </a>

      {/* Referral card */}
      {referralLink && (
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-[var(--gradient-start)]/10 to-[var(--gradient-end)]/10 border border-[var(--primary)]/20 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">🎁 Invite friends, earn rewards</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Your referral link: <code className="text-[var(--primary)]">{referralLink}</code></p>
          </div>
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-md transition-all flex-shrink-0"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border-subtle)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'activity' ? (
        <ActivityTimeline userId={user.id} />
      ) : activeTab === 'stats' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Books read', value: String(liked.length), icon: '📖' },
            { label: 'Wishlisted', value: String(wishlisted.length), icon: '📚' },
            { label: 'Favorites', value: String(favorited.length), icon: '⭐' },
            { label: 'Member since', value: profile?.created_at ? new Date(profile.created_at).getFullYear().toString() : '—', icon: '🗓️' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
              <span className="text-2xl block mb-1">{stat.icon}</span>
              <p className="text-2xl font-display font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : currentBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {currentBooks.map(item => (
            <a
              key={item.book_id}
              href={item.book_slug ? `/book/${item.book_slug}` : '#'}
              className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors"
            >
              <p className="text-sm font-semibold text-[var(--text)] line-clamp-2">{item.book_title || 'Untitled'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{item.book_author}</p>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">{tabs.find(t => t.id === activeTab)?.icon}</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">
            No {activeTab === 'history' ? 'liked books' : activeTab} yet
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Start exploring to build your personal library.
          </p>
          <a href="/explore" className="inline-flex mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold shadow-md">
            Browse books
          </a>
        </div>
      )}
    </div>
  );
}
