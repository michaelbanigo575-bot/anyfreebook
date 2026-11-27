import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { GroupsClient } from './GroupsClient';

// the address can carry an invite code, so it is never passed on to other sites or search engines
export const metadata: Metadata = { title: 'Groups', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default function GroupsPage() {
  if (!CHAT_ENABLED) notFound();
  return <GroupsClient />;
}
