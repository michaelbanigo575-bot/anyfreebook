'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface Notification {
  id: string;
  type: 'live_class' | 'new_publication' | 'new_post';
  title: string;
  link: string;
  created_at: string;
  read_at: string | null;
}

const TYPE_ICON: Record<string, string> = { live_class: '🔴', new_publication: '📖', new_post: '📰' };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const sb = createClient();
    const { data } = await sb
      .from('notifications')
      .select('id, type, title, link, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(15);
    const list = (data as Notification[]) || [];
    setItems(list);
    setUnread(list.filter(n => !n.read_at).length);
  }, [user]);

  // Initial load + live inserts
  useEffect(() => {
    if (!user) return;
    load();
    const sb = createClient();
    const channel = sb
      .channel(`notif-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => {
          setItems(prev => [payload.new as Notification, ...prev].slice(0, 15));
          setUnread(u => u + 1);
        })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [user, load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && user) {
      // Mark all read
      const sb = createClient();
      await sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null).eq('user_id', user.id);
      setUnread(0);
      setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="relative p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-[70] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text)]">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-10">
                Nothing yet — follow authors to hear when they publish or go live.
              </p>
            ) : (
              items.map(n => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--border-subtle)] last:border-0"
                >
                  <span className="text-lg flex-shrink-0">{TYPE_ICON[n.type] || '🔔'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-[var(--text)] leading-snug">{n.title}</span>
                    <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">{timeAgo(n.created_at)} ago</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
