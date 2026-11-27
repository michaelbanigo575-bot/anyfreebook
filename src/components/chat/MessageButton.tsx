'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CHAT_ENABLED } from '@/lib/chat/types';

/** Starts a chat with an author. Hidden on your own profile and while chat is switched off. */
export function MessageButton({ authorId }: { authorId: string }) {
  const { user } = useAuth();
  if (!CHAT_ENABLED || user?.id === authorId) return null;
  const target = `/messages?to=${encodeURIComponent(authorId)}`;
  return (
    <Link href={user ? target : `/login?redirect=${encodeURIComponent(target)}`} className="inline-flex items-center min-h-[40px] px-5 rounded-full border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold">
      Message
    </Link>
  );
}
