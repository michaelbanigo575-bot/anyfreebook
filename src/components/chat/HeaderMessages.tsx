'use client';

import { useAuth } from '@/components/AuthProvider';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { MessagesIconLink, useChatUnread } from './Unread';

/** Shown to signed-in people once chat is switched on. */
export function HeaderMessages() {
  const { user } = useAuth();
  const counts = useChatUnread();
  return CHAT_ENABLED && user ? <MessagesIconLink counts={counts} /> : null;
}
