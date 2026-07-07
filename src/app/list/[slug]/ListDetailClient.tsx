'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import type { Book } from '@/lib/data';

interface CollectionBook {
  book_id: string;
  book_title: string | null;
  book_author: string | null;
  book_slug: string | null;
  book_cover_url: string | null;
  added_at: string;
}

interface ListInfo {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export function ListDetailClient({ list, initialBooks }: { list: ListInfo; initialBooks: CollectionBook[] }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [books, setBooks] = useState(initialBooks);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = user?.id === list.user_id;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/list/${list.slug}` : '';

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search-stream?q=${encodeURIComponent(q)}&source=all`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const collected: Book[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === 'source') collected.push(...msg.books);
        }
      }
      setSearchResults(collected.slice(0, 24));
    } catch {}
    setSearching(false);
  }, []);

  const addBook = async (book: Book) => {
    const { error } = await supabase.from('collection_books').insert({
      collection_id: list.id,
      book_id: book.id,
      book_title: book.title,
      book_author: book.author,
      book_slug: book.slug,
      book_cover_url: book.coverUrl,
    });
    if (!error) {
      setBooks(prev => [{ book_id: book.id, book_title: book.title, book_author: book.author, book_slug: book.slug, book_cover_url: book.coverUrl, added_at: new Date().toISOString() }, ...prev]);
    }
  };

  const removeBook = async (bookId: string) => {
    await supabase.from('collection_books').delete().eq('collection_id', list.id).eq('book_id', bookId);
    setBooks(prev => prev.filter(b => b.book_id !== bookId));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary-light)] text-[var(--primary)] mb-3">
          📋 Reading List
        </span>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">{list.title}</h1>
        {list.description && <p className="mt-2 text-[var(--text-secondary)]">{list.description}</p>}
        <div className="flex items-center gap-3 mt-4">
          <p className="text-sm text-[var(--text-muted)]">{books.length} book{books.length !== 1 ? 's' : ''}</p>
          <button onClick={copyLink} className="text-xs font-medium text-[var(--primary)] hover:underline">
            {copied ? '✓ Link copied!' : '🔗 Copy share link'}
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="mb-8">
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold"
            >
              + Add books to this list
            </button>
          ) : (
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
              <div className="flex gap-2 mb-3">
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); runSearch(e.target.value); }}
                  placeholder="Search books to add..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
                />
                <button
                  onClick={() => { setShowAdd(false); setQuery(''); setSearchResults([]); }}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)]"
                >
                  Done
                </button>
              </div>
              {searching && <p className="text-xs text-[var(--text-muted)]">Searching...</p>}
              {searchResults.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {searchResults.map(b => {
                    const already = books.some(bk => bk.book_id === b.id);
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-[var(--surface-hover)]">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text)] truncate">{b.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{b.author}</p>
                        </div>
                        <button
                          onClick={() => addBook(b)}
                          disabled={already}
                          className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-semibold bg-[var(--primary)] text-white disabled:opacity-40"
                        >
                          {already ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {books.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No books in this list yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {books.map(b => (
            <div key={b.book_id} className="relative group rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-3">
              <a href={b.book_slug ? `/book/${b.book_slug}` : '#'}>
                <p className="text-sm font-semibold text-[var(--text)] line-clamp-2">{b.book_title || 'Untitled'}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{b.book_author}</p>
              </a>
              {isOwner && (
                <button
                  onClick={() => removeBook(b.book_id)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
