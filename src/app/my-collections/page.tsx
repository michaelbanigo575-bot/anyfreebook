'use client';

import { useState, useEffect } from 'react';
import type { Book } from '@/lib/data';

interface UserCollection {
  id: string;
  title: string;
  description: string;
  books: string[];
  isPublic: boolean;
  createdAt: string;
  shareCount: number;
}

export default function MyCollectionsPage() {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('afb_user_collections');
    if (saved) setCollections(JSON.parse(saved));
  }, []);

  const save = (cols: UserCollection[]) => {
    setCollections(cols);
    localStorage.setItem('afb_user_collections', JSON.stringify(cols));
  };

  const createCollection = () => {
    if (!newTitle.trim()) return;
    const col: UserCollection = {
      id: `uc-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      books: [],
      isPublic: true,
      createdAt: new Date().toISOString(),
      shareCount: 0,
    };
    save([col, ...collections]);
    setNewTitle('');
    setNewDesc('');
    setShowCreate(false);
  };

  const deleteCollection = (id: string) => {
    save(collections.filter(c => c.id !== id));
  };

  const shareCollection = async (col: UserCollection) => {
    const url = `${window.location.origin}/my-collections?shared=${col.id}`;
    const text = `Check out my reading list "${col.title}" on ANYFREEBOOK — ${col.books.length} free books! 📚`;
    if (navigator.share) {
      try { await navigator.share({ title: col.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(text + '\n' + url);
      setCopied(col.id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const shareWhatsApp = (col: UserCollection) => {
    const url = `${window.location.origin}/my-collections?shared=${col.id}`;
    const text = `Check out my reading list "${col.title}" on ANYFREEBOOK — ${col.books.length} free books! 📚`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">
            My Reading Lists
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Create and share curated book collections with friends
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all"
        >
          + New List
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-bold text-[var(--text)] mb-4">Create Reading List</h2>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="List name (e.g., 'My CS Textbooks')"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm mb-3 outline-none focus:border-[var(--primary)]"
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm mb-4 outline-none focus:border-[var(--primary)] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={createCollection}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text)] text-sm font-medium border border-[var(--border)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections list */}
      {collections.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No reading lists yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Create a list and add books from search results or book pages
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Create your first list
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {collections.map(col => (
            <div key={col.id} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:shadow-lg transition-shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--text)]">{col.title}</h3>
                      {col.isPublic && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">PUBLIC</span>
                      )}
                    </div>
                    {col.description && (
                      <p className="text-sm text-[var(--text-muted)] mt-1">{col.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                      <span>📚 {col.books.length} books</span>
                      <span>📤 {col.shareCount} shares</span>
                      <span>Created {new Date(col.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--border-subtle)] px-6 py-3 flex items-center gap-2 bg-[var(--bg-secondary)]">
                <button
                  onClick={() => shareCollection(col)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  {copied === col.id ? '✓ Copied!' : '📤 Share'}
                </button>
                <button
                  onClick={() => shareWhatsApp(col)}
                  className="px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  WhatsApp
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested collections */}
      <div className="mt-12">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">📖 Suggested Reading Lists</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Best Free CS Textbooks', count: 15, category: 'Technology' },
            { title: 'Medical School Essentials', count: 12, category: 'Medicine' },
            { title: 'Classic Literature Must-Reads', count: 25, category: 'Arts & Humanities' },
            { title: 'Data Science Starter Pack', count: 10, category: 'Technology' },
            { title: 'Business & Finance Basics', count: 8, category: 'Business' },
            { title: 'Physics for Beginners', count: 7, category: 'Sciences' },
          ].map(s => (
            <a
              key={s.title}
              href={`/search?q=${encodeURIComponent(s.category)}`}
              className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-md transition-all group"
            >
              <h3 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)]">{s.title}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">{s.count} books · {s.category}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
