'use client';

import { useState, useRef, useEffect } from 'react';
import { searchBooks, type Book } from '@/lib/data';

interface SearchBarProps {
  compact?: boolean;
}

export function SearchBar({ compact }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const found = searchBooks(query).slice(0, 6);
      setResults(found);
      setIsOpen(found.length > 0);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      window.location.href = `/book/${results[selectedIndex].slug}`;
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`
        relative flex items-center
        ${compact
          ? 'h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]'
          : 'h-12 md:h-14 rounded-2xl bg-[var(--surface)] shadow-lg border border-[var(--border)]'
        }
        focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:border-transparent
        transition-all
      `}>
        <svg
          className={`flex-shrink-0 text-[var(--text-muted)] ${compact ? 'ml-2.5 w-4 h-4' : 'ml-4 w-5 h-5'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={compact ? 'Search books...' : 'Search 1,700,000+ free books, audiobooks...'}
          className={`
            w-full bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-muted)]
            ${compact ? 'px-2 text-sm' : 'px-3 text-base'}
          `}
          aria-label="Search books"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="flex-shrink-0 mr-2 p-1 rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        )}
        {!compact && (
          <div className="hidden sm:flex items-center gap-1 mr-3 text-[10px] text-[var(--text-muted)]">
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded border border-[var(--border)] font-mono">/</kbd>
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden z-50 animate-slide-down">
          {results.map((book, i) => (
            <a
              key={book.id}
              href={`/book/${book.slug}`}
              className={`
                flex items-center gap-3 px-4 py-3 transition-colors
                ${i === selectedIndex ? 'bg-[var(--primary-light)]' : 'hover:bg-[var(--surface-hover)]'}
                ${i > 0 ? 'border-t border-[var(--border-subtle)]' : ''}
              `}
            >
              <BookCoverMini title={book.title} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text)] line-clamp-1">{book.title}</p>
                <p className="text-xs text-[var(--text-muted)] line-clamp-1">{book.author} &middot; {book.category.name}</p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                FREE
              </span>
            </a>
          ))}
          <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              Press <kbd className="px-1 py-0.5 bg-[var(--surface)] rounded border border-[var(--border)] text-[10px] font-mono">Enter</kbd> to search all results
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BookCoverMini({ title }: { title: string }) {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-emerald-500 to-emerald-700',
    'from-purple-500 to-purple-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700',
    'from-cyan-500 to-cyan-700',
  ];
  const idx = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={`w-8 h-12 rounded flex-shrink-0 bg-gradient-to-br ${colors[idx]} shadow-sm flex items-end p-1`}>
      <div className="w-full h-[1px] bg-white/30" />
    </div>
  );
}
