'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Bottom sheet: backdrop, Escape / swipe-down to close, locks page scroll while open. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="absolute left-0 right-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-[var(--surface)] border-t border-[var(--border)] shadow-2xl animate-slide-up"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragY ? 'none' : undefined, paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Drag handle: swipe down to dismiss */}
        <div
          className="sticky top-0 z-10 bg-[var(--surface)] pt-2.5 pb-2 flex flex-col items-center touch-none"
          onTouchStart={e => { startY.current = e.touches[0].clientY; }}
          onTouchMove={e => { if (startY.current !== null) setDragY(Math.max(0, e.touches[0].clientY - startY.current)); }}
          onTouchEnd={() => { if (dragY > 90) onClose(); setDragY(0); startY.current = null; }}
        >
          <span className="w-10 h-1.5 rounded-full bg-[var(--border)]" />
          <p className="mt-2 text-sm font-bold text-[var(--text)]">{title}</p>
        </div>
        <div className="px-4 pb-2">{children}</div>
      </div>
    </div>
  );
}

const rowClass = 'flex items-center justify-between w-full px-3 py-3.5 text-[15px] font-medium text-[var(--text)] rounded-xl hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)] transition-colors text-left';

function Row({ href, children, onClick }: { href: string; children: ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={rowClass}>
      {children}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--text-muted)]" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}

/** The "Menu" sheet: big tiles for the main destinations, small links for the rest. */
export function MobileMenuSheet({ open, onClose, isDark, onToggleTheme }: { open: boolean; onClose: () => void; isDark: boolean; onToggleTheme: () => void }) {
  const { user } = useAuth();
  const tiles = [
    { label: 'Audiobooks', href: '/audiobooks', emoji: '🎧' },
    { label: 'Feed', href: '/feed', emoji: '📰' },
    { label: 'Trending', href: '/trending', emoji: '🔥' },
    { label: 'Free Guides', href: '/guides', emoji: '📘' },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      <div className="grid grid-cols-2 gap-3 mb-3">
        {tiles.map(t => (
          <Link
            key={t.href}
            href={t.href}
            onClick={onClose}
            className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl" aria-hidden>{t.emoji}</span>
            <span className="text-sm font-bold text-[var(--text)]">{t.label}</span>
          </Link>
        ))}
      </div>
      <Row href="/explore" onClick={onClose}>📚 All categories</Row>
      <Row href="/institutions" onClick={onClose}>Institutions</Row>
      <Row href="/study-plan" onClick={onClose}>Study Plan</Row>
      <Row href="/rewards" onClick={onClose}>Rewards</Row>
      {!user && <Row href="/creators" onClick={onClose}>Publish &amp; Earn</Row>}
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <LanguageSwitcher compact />
        <button onClick={onToggleTheme} className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text)] active:scale-95 transition-transform">
          {isDark ? '☀️ Light mode' : '🌙 Dark mode'}
        </button>
      </div>
    </Sheet>
  );
}

const TabIcon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/** Phone bottom bar: Home · Explore · Search · Classes · Me. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [meOpen, setMeOpen] = useState(false);
  const close = () => setMeOpen(false);
  const name = profile?.display_name || user?.email || 'Account';

  const tabs = [
    { label: 'Home', href: '/', d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { label: 'Explore', href: '/explore', d: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20' },
    { label: 'Search', href: '/search', d: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35', center: true },
    { label: 'Classes', href: '/classrooms', d: 'M23 7l-7 5 7 5V7zM1 5h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z' },
  ];
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname?.startsWith(href + '/'));
  const tabClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[11px] font-semibold transition-colors ${active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`;

  if (pathname?.startsWith('/admin')) return null;

  return (
    <>
      <nav aria-label="Main" className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border-subtle)] safe-area-bottom">
        <div className="flex items-stretch h-16">
          {tabs.map(t => {
            const active = isActive(t.href);
            return (
              <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[var(--primary)]" />}
                {t.center ? (
                  <span className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-lg">
                    <TabIcon d={t.d} />
                  </span>
                ) : <TabIcon d={t.d} />}
                <span>{t.label}</span>
              </Link>
            );
          })}
          {user ? (
            <button onClick={() => setMeOpen(true)} aria-haspopup="dialog" className={tabClass(meOpen)}>
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-bold flex items-center justify-center">
                {name[0].toUpperCase()}
              </span>
              <span>Me</span>
            </button>
          ) : (
            <Link href="/login" className={tabClass(isActive('/login'))}>
              <TabIcon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </nav>

      <Sheet open={meOpen && !!user} onClose={close} title={name}>
        {user?.email && name !== user.email && <p className="text-xs text-[var(--text-muted)] -mt-1 mb-2 text-center truncate">{user.email}</p>}
        <Row href="/profile" onClick={close}>My profile</Row>
        <Row href={profile?.is_creator ? '/creators/dashboard' : '/creators'} onClick={close}>
          {profile?.is_creator ? 'Creator dashboard' : 'Become a creator'}
        </Row>
        <Row href="/classrooms" onClick={close}>My classrooms</Row>
        <Row href="/study-plan" onClick={close}>Study plan</Row>
        <Row href="/settings" onClick={close}>Settings</Row>
        <button
          onClick={() => { close(); void signOut(); }}
          className="w-full mt-3 py-3.5 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 text-[15px] font-bold active:scale-[0.98] transition-transform"
        >
          Sign out
        </button>
      </Sheet>
    </>
  );
}
