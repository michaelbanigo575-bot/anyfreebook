'use client';

import { useState, useEffect } from 'react';
import { BookGrid } from '@/components/BookGrid';
import { getAllBooks, type Book } from '@/lib/data';

type Tab = 'wishlist' | 'favorites' | 'history' | 'stats';

interface Interactions {
  liked: string[];
  wishlisted: string[];
  favorited: string[];
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const [interactions, setInteractions] = useState<Interactions>({ liked: [], wishlisted: [], favorited: [] });
  const allBooks = getAllBooks();

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('anyfreebook-interactions') || '{}');
      setInteractions({
        liked: data.liked || [],
        wishlisted: data.wishlisted || [],
        favorited: data.favorited || [],
      });
    } catch {}
  }, []);

  const wishlistBooks = allBooks.filter(b => interactions.wishlisted.includes(b.id));
  const favBooks = allBooks.filter(b => interactions.favorited.includes(b.id));
  const likedBooks = allBooks.filter(b => interactions.liked.includes(b.id));

  const tabs: { id: Tab; label: string; icon: string; count: number }[] = [
    { id: 'wishlist', label: 'Wishlist', icon: '📚', count: wishlistBooks.length },
    { id: 'favorites', label: 'Favorites', icon: '⭐', count: favBooks.length },
    { id: 'history', label: 'History', icon: '❤️', count: likedBooks.length },
    { id: 'stats', label: 'Stats', icon: '📊', count: 0 },
  ];

  const currentBooks = activeTab === 'wishlist' ? wishlistBooks : activeTab === 'favorites' ? favBooks : likedBooks;

  return (
    <div className="content-wrapper py-8">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          R
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-[var(--text)]">Reader</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {interactions.liked.length} liked &middot; {interactions.wishlisted.length} wishlisted &middot; {interactions.favorited.length} favorites
          </p>
        </div>
      </div>

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
      {activeTab === 'stats' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Books read', value: '0', icon: '📖' },
            { label: 'Pages read', value: '0', icon: '📄' },
            { label: 'Hours listened', value: '0', icon: '🎧' },
            { label: 'Day streak', value: '0', icon: '🔥' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
              <span className="text-2xl block mb-1">{stat.icon}</span>
              <p className="text-2xl font-display font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : currentBooks.length > 0 ? (
        <BookGrid books={currentBooks} layout="grid" />
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
