'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { useAuth } from './AuthProvider';
import { NotificationsBell } from './NotificationsBell';
import { CategoryMenu } from './CategoryMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTheme } from './ThemeProvider';
import { MoreMenu, AccountMenu } from './NavMenus';
import { MobileMenuSheet, MobileBottomNav } from './MobileNav';
import { SectionSwitch, useSection } from './SectionSwitch';

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const section = useSection();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, setTheme, isCustom } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    // A custom gradient has no light/dark pair — fall back to the light theme.
    if (isCustom) {
      setTheme('light');
      return;
    }
    setTheme(isDark ? 'light' : 'dark');
  };

  if (pathname?.startsWith('/admin')) return null;

  // Desktop shows the section's main links; everything else lives under "More"
  const primaryLinks = section === 'community'
    ? [{ label: 'Feed', href: '/feed' }, { label: 'Classes', href: '/classrooms' }, { label: 'Institutions', href: '/institutions' }, { label: 'Publish & Earn', href: '/creators' }]
    : [{ label: 'Explore', href: '/explore' }, { label: 'Audiobooks', href: '/audiobooks' }, { label: 'Free Guides', href: '/guides' }];
  const moreLinks = [
    ...(section === 'community' ? [{ label: 'Find authors', href: '/creators/discover' }] : []),
    { label: 'My library', href: '/library' },
    { label: 'Study Plan', href: '/study-plan' },
    { label: 'Rewards', href: '/rewards' },
  ];

  return (
    <>
      <header
        className={`ocean-header 
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? 'glass shadow-md border-b border-[var(--border-subtle)]'
            : 'bg-transparent'
          }
        `}
      >
        <div className="content-wrapper">
          <div className="flex items-center justify-between h-14 md:h-16">
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
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
              {primaryLinks.map(link => {
                const active = pathname === link.href || pathname?.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`px-2.5 xl:px-3 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                      active
                        ? 'text-[var(--text)] bg-[var(--surface-hover)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {section === 'discover' && <CategoryMenu />}
              <MoreMenu links={moreLinks} />
            </nav>

            {/* Desktop search + actions */}
            <div className="hidden md:flex items-center gap-1.5 xl:gap-3">
              <div className="hidden xl:block w-64 2xl:w-72">
                <SearchBar compact />
              </div>
              <Link href="/search" aria-label="Search" className="xl:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </Link>
              <LanguageSwitcher compact />
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
              <NotificationsBell />
              {user ? (
                <AccountMenu />
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-md transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Phone / tablet actions: search, notifications, menu */}
            <div className="flex md:hidden items-center gap-1">
              <Link href="/search" aria-label="Search" className="p-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-hover)]">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </Link>
              <NotificationsBell />
            </div>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden ml-1 px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-[var(--text)] flex items-center gap-1.5"
              aria-label="Open menu"
              aria-haspopup="dialog"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></svg>
              Menu
            </button>
          </div>
          <SectionSwitch section={section} />
        </div>
      </header>

      <MobileMenuSheet section={section} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} isDark={isDark} onToggleTheme={toggleTheme} />
      <MobileBottomNav section={section} />

      {/* Spacer for fixed navbar */}
      {/* header row (56/64px) plus the section switch row (52px) */}
      <div className="h-[108px] md:h-[116px]" />
    </>
  );
}
