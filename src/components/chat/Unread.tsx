'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CHAT_ENABLED, type ChatApi, type Unread } from '@/lib/chat/types';
import { supabaseChatApi } from '@/lib/chat/supabaseApi';
import { watchChat } from '@/lib/chat/watch';

const NONE: Unread = { messages: 0, requests: 0 };
const UnreadContext = createContext<Unread>(NONE);

/** Keeps one count of what is waiting. It stays at zero if chat is off, not set up, or unreachable. */
export function useUnreadCounts(api: ChatApi | null): Unread {
  const [counts, setCounts] = useState<Unread>(NONE);
  useEffect(() => {
    setCounts(NONE);
    if (!api) return;
    let live = true;
    let latest = 0;
    let stop: (() => void) | undefined;
    const load = async () => {
      const mine = ++latest;
      try {
        const next = await api.unread();
        // an older answer arriving late must not undo a newer one
        if (live && mine === latest) setCounts(next);
      } catch { /* a badge is never worth an error message */ }
    };
    api.state().then(state => {
      if (!live || state === 'unavailable') return;
      load();
      stop = watchChat(api, load);
    }).catch(() => {});
    return () => { live = false; stop?.(); };
  }, [api]);
  return counts;
}

/** One live count for the whole app, shared by every Messages link. */
export function ChatUnreadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const id = user?.id;
  const api = useMemo(() => (CHAT_ENABLED && id ? supabaseChatApi(id) : null), [id]);
  const counts = useUnreadCounts(api);
  return <UnreadContext.Provider value={counts}>{children}</UnreadContext.Provider>;
}

export const useChatUnread = () => useContext(UnreadContext);

/** What the badge counts: unread messages and requests waiting for an answer, in chats and groups. */
export const totalUnread = (c: Unread) => c.messages + c.requests + groupsUnread(c);
export const groupsUnread = (c: Unread) => (c.groupMessages || 0) + (c.joinRequests || 0);

export function unreadLabel(c: Unread): string {
  const parts = [
    c.messages ? `${c.messages} unread message${c.messages === 1 ? '' : 's'}` : '',
    c.requests ? `${c.requests} message request${c.requests === 1 ? '' : 's'}` : '',
    c.groupMessages ? `${c.groupMessages} unread group message${c.groupMessages === 1 ? '' : 's'}` : '',
    c.joinRequests ? `${c.joinRequests} waiting to join your groups` : '',
  ].filter(Boolean);
  return parts.length ? `Messages, ${parts.join(' and ')}` : 'Messages';
}

export function Badge({ count, className = '' }: { count: number; className?: string }) {
  if (count < 1) return null;
  return (
    <span aria-hidden className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** The envelope in the header. */
export function MessagesIconLink({ counts, className = '' }: { counts: Unread; className?: string }) {
  return (
    <Link href="/messages" aria-label={unreadLabel(counts)} className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text)] hover:bg-[var(--surface-hover)] ${className}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6" />
      </svg>
      <Badge count={totalUnread(counts)} className="absolute -top-0.5 -right-0.5" />
    </Link>
  );
}
