'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { useAuth } from './AuthProvider';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const dark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(dark);
    if (dark) document.documentElement.classList.add('dark');

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  if (pathname?.startsWith('/admin')) return null;

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Explore', href: '/explore' },
    { label: 'Trending', href: '/trending' },
    { label: 'Audiobooks', href: '/audiobooks' },
    { label: 'Feed', href: '/feed' },
    { label: 'Publish & Earn', href: '/creators' },
    { label: 'Study Plan', href: '/study-plan' },
    { label: 'Rewards', href: '/rewards' },
  ];

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? 'glass shadow-md border-b border-[var(--border-subtle)]'
            : 'bg-transparent'
          }
        `}
      >
        <div className="content-wrapper">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-[var(--text)]">
                ANY<span className="gradient-text">FREE</span>BOOK
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop search + actions */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-72">
                <SearchBar compact />
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                  </svg>
                )}
              </button>
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(profile?.display_name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[var(--text)] max-w-[100px] truncate">
                    {profile?.display_name || user.email}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-md transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 8h16"/><path d="M4 16h16"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass border-t border-[var(--border-subtle)] animate-slide-down">
            <div className="content-wrapper py-4 space-y-2">
              <div className="pb-3">
                <SearchBar />
              </div>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    {profile?.display_name || user.email}
                  </Link>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-lg text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border-subtle)] safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {[
            { icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', label: 'Home', href: '/' },
            { icon: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35', label: 'Search', href: '/search' },
            { icon: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20', label: 'Library', href: '/explore' },
            { icon: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', label: 'Audio', href: '/audiobooks' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16 md:h-18" />
    </>
  );
}
