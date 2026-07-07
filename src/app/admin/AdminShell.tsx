'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NavGroup {
  label: string;
  items: { href: string; label: string; icon: React.ReactNode }[];
}

const NAV: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { href: '/admin', label: 'Overview', icon: <IconGrid /> },
      { href: '/admin/health', label: 'Site Health', icon: <IconPulse /> },
      { href: '/admin/sources', label: 'Book Sources', icon: <IconDatabase /> },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/admin/users', label: 'Users', icon: <IconUsers /> },
      { href: '/admin/referrals', label: 'Referrals', icon: <IconGift /> },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { href: '/admin/deployments', label: 'Deployments', icon: <IconRocket /> },
      { href: '/admin/github', label: 'GitHub', icon: <IconGit /> },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/admin/integrations', label: 'Integrations', icon: <IconLink /> },
    ],
  },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel = NAV.flatMap(g => g.items).find(i => i.href === pathname)?.label || 'Overview';

  const refresh = () => startTransition(() => router.refresh());
  const signOut = async () => {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen w-64 bg-slate-950/95 backdrop-blur border-r border-slate-800/80 z-40 flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform`}>
        <div className="h-16 px-5 flex items-center gap-2 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">A</div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">ANYFREEBOOK</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Control Panel</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV.map(group => (
            <div key={group.label}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-2">{group.label}</div>
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
                        }`}
                      >
                        <span className={`w-4 h-4 flex items-center justify-center ${active ? 'text-indigo-400' : 'text-slate-500'}`}>{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
              {email.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white truncate">{email}</div>
              <div className="text-[10px] text-emerald-400">Admin</div>
            </div>
            <button
              onClick={signOut}
              className="text-slate-500 hover:text-white transition-colors p-1"
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </button>
          </div>
          <Link href="/" className="mt-2 block text-center text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            ← Return to site
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="md:hidden fixed inset-0 bg-black/60 z-30" />
      )}

      {/* Main */}
      <div className="md:pl-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-20 flex items-center px-4 md:px-8 gap-3">
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden text-slate-400 hover:text-white p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </button>
          <div className="flex-1">
            <div className="text-[11px] text-slate-500 uppercase tracking-widest">Admin</div>
            <h1 className="text-base md:text-lg font-semibold text-white leading-tight">{activeLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
            <button
              onClick={refresh}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/70 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={pending ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/* Icons */
function IconGrid() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function IconPulse() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>; }
function IconDatabase() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>; }
function IconUsers() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconGift() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>; }
function IconRocket() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>; }
function IconGit() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>; }
function IconLink() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
