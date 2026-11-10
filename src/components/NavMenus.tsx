'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

/** Small dropdown shell: closes on outside click and Escape. */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

const itemClass =
  'flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors';

const panelClass =
  'absolute right-0 top-full mt-2 min-w-[220px] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-1.5 z-50 animate-slide-down';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** "More" menu: the secondary links that used to overflow the navbar. */
export function MoreMenu({ links }: { links: { label: string; href: string; icon?: ReactNode }[] }) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1"
      >
        More <Chevron open={open} />
      </button>
      {open && (
        <div role="menu" className={`${panelClass} left-0 right-auto`}>
          {links.map(l => (
            <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Signed-in account menu: profile, creator dashboard, settings, sign out. */
export function AccountMenu() {
  const { user, profile, signOut } = useAuth();
  const { open, setOpen, ref } = useDropdown();
  if (!user) return null;

  const name = profile?.display_name || user.email || 'Account';
  const isCreator = Boolean(profile?.is_creator);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {name[0].toUpperCase()}
        </span>
        <span className="hidden 2xl:block text-sm font-medium text-[var(--text)] max-w-[110px] truncate">{name}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div role="menu" className={panelClass}>
          <div className="px-3 pt-2 pb-2.5 mb-1 border-b border-[var(--border-subtle)]">
            <p className="text-sm font-semibold text-[var(--text)] truncate">{name}</p>
            {user.email && name !== user.email && <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>}
          </div>
          <Link href="/profile" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>My profile</Link>
          <Link href={isCreator ? '/creators/dashboard' : '/creators'} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            {isCreator ? 'Creator dashboard' : 'Become a creator'}
          </Link>
          <Link href="/classrooms" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>My classrooms</Link>
          <Link href="/study-plan" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>Study plan</Link>
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>Settings</Link>
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); void signOut(); }}
            className={`${itemClass} !text-red-600 dark:!text-red-400`}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
