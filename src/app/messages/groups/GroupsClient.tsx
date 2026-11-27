'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { GroupScreen, type GroupView } from '@/components/chat/GroupScreen';
import { supabaseGroupApi } from '@/lib/chat/supabaseGroupApi';

const address = (v: GroupView) => {
  const base = '/messages/groups';
  if (v.kind === 'group') return `${base}?g=${encodeURIComponent(v.id)}`;
  if (v.kind === 'study') return `${base}?g=${encodeURIComponent(v.id)}&study=1`;
  if (v.kind === 'info') return `${base}?g=${encodeURIComponent(v.id)}&details=1`;
  if (v.kind === 'invite') return `${base}?invite=${encodeURIComponent(v.token)}`;
  return v.kind === 'list' ? base : `${base}?view=${v.kind}`;
};

/** Keeps what is open in the address, so the phone's back button closes it. */
function Live({ userId }: { userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const api = useMemo(() => supabaseGroupApi(userId), [userId]);
  const g = params.get('g');
  const invite = params.get('invite');
  const page = params.get('view');
  const view: GroupView = invite ? { kind: 'invite', token: invite }
    : g ? { kind: params.get('details') ? 'info' : params.get('study') ? 'study' : 'group', id: g }
      : page === 'create' || page === 'discover' ? { kind: page } : { kind: 'list' };

  return (
    <GroupScreen api={api} view={view} onView={v => {
      // switching between chat and study does not pile up history
      if (v.kind === 'list' || v.kind === 'discover' || v.kind === 'study' || (v.kind === 'group' && view.kind === 'study')) router.replace(address(v), { scroll: false });
      else router.push(address(v), { scroll: false });
    }} />
  );
}

export function GroupsClient() {
  const { user, loading } = useAuth();
  // someone opening an invite link signs in and comes back to it
  const [here, setHere] = useState('/messages/groups');
  useEffect(() => { setHere(window.location.pathname + window.location.search); }, []);
  if (loading) return <p className="py-8 text-center text-[var(--text-muted)]">Loading…</p>;
  if (!user) {
    return (
      <div className="content-wrapper py-8 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-display font-bold text-[var(--text)]">Groups</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in to join group chats.</p>
        <Link href={`/login?redirect=${encodeURIComponent(here)}`} className="inline-flex items-center min-h-[46px] mt-4 px-6 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign in</Link>
      </div>
    );
  }
  return (
    <Suspense fallback={<p className="py-8 text-center text-[var(--text-muted)]">Loading…</p>}>
      <Live userId={user.id} />
    </Suspense>
  );
}
