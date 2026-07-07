'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface UserCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  bookCount: number;
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

export default function MyCollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('collections')
      .select('id, title, slug, description, is_public, created_at, collection_books(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setCollections((data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      is_public: c.is_public,
      created_at: c.created_at,
      bookCount: c.collection_books?.[0]?.count || 0,
    })));
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const createCollection = async () => {
    if (!newTitle.trim() || !user) return;
    const baseSlug = slugify(newTitle);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const { error } = await supabase.from('collections').insert({
      user_id: user.id,
      title: newTitle,
      slug,
      description: newDesc || null,
      is_public: true,
    });

    if (!error) {
      setNewTitle('');
      setNewDesc('');
      setShowCreate(false);
      loadCollections();
    }
  };

  const deleteCollection = async (id: string) => {
    await supabase.from('collections').delete().eq('id', id);
    setCollections(prev => prev.filter(c => c.id !== id));
  };

  const shareCollection = async (col: UserCollection) => {
    const url = `${window.location.origin}/list/${col.slug}`;
    const text = `Check out my reading list "${col.title}" on ANYFREEBOOK — ${col.bookCount} free books! 📚`;
    if (navigator.share) {
      try { await navigator.share({ title: col.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(text + '\n' + url);
      setCopied(col.id);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const shareWhatsApp = (col: UserCollection) => {
    const url = `${window.location.origin}/list/${col.slug}`;
    const text = `Check out my reading list "${col.title}" on ANYFREEBOOK — ${col.bookCount} free books! 📚`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };

  if (!authLoading && !user) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">📋</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Sign in to create reading lists</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Reading lists sync across your devices and can be shared with anyone via a link.
        </p>
        <a href="/login" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">
          Sign In
        </a>
      </div>
    );
  }

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

      {loading ? (
        <p className="text-center py-20 text-[var(--text-muted)]">Loading...</p>
      ) : collections.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No reading lists yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Create a list, then add books to it from the list page
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
                  <a href={`/list/${col.slug}`} className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--text)] hover:text-[var(--primary)] transition-colors">{col.title}</h3>
                      {col.is_public && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">PUBLIC</span>
                      )}
                    </div>
                    {col.description && (
                      <p className="text-sm text-[var(--text-muted)] mt-1">{col.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                      <span>📚 {col.bookCount} books</span>
                      <span>Created {new Date(col.created_at).toLocaleDateString()}</span>
                    </div>
                  </a>
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
