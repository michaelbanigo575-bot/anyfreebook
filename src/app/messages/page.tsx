import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { MessagesClient } from './MessagesClient';

export const metadata: Metadata = { title: 'Messages', robots: { index: false, follow: false } };

export default function MessagesPage() {
  // Until chat is switched on, the address behaves as if it does not exist
  if (!CHAT_ENABLED) notFound();
  return <MessagesClient />;
}
