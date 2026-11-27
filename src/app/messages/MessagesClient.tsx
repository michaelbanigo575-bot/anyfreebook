'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ChatScreen, type ChatView } from '@/components/chat/ChatScreen';
import { supabaseChatApi } from '@/lib/chat/supabaseApi';

/** Keeps what is open in the address, so the phone's back button closes a chat. */
function Live({ userId }: { userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const api = useMemo(() => supabaseChatApi(userId), [userId]);
  const c = params.get('c');
  const to = params.get('to');
  const view: ChatView = c ? { kind: 'thread', id: c } : to ? { kind: 'new', to } : params.get('settings') ? { kind: 'settings' } : { kind: 'inbox' };

  return (
    <ChatScreen api={api} view={view} onView={v => {
      const next = v.kind === 'thread' ? `/messages?c=${encodeURIComponent(v.id)}` : v.kind === 'new' ? `/messages?to=${encodeURIComponent(v.to)}` : v.kind === 'settings' ? '/messages?settings=1' : '/messages';
      if (v.kind === 'inbox') router.replace(next, { scroll: false }); else router.push(next, { scroll: false });
    }} />
  );
}

export function MessagesClient() {
  const { user, loading } = useAuth();
  if (loading) return <p className="py-8 text-center text-[var(--text-muted)]">Loading…</p>;
  if (!user) {
    return (
      <div className="content-wrapper py-8 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-display font-bold text-[var(--text)]">Messages</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in to chat with authors and readers.</p>
        <Link href="/login?redirect=/messages" className="inline-flex items-center min-h-[46px] mt-4 px-6 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign in</Link>
      </div>
    );
  }
  return (
    <Suspense fallback={<p className="py-8 text-center text-[var(--text-muted)]">Loading…</p>}>
      <Live userId={user.id} />
    </Suspense>
  );
}
