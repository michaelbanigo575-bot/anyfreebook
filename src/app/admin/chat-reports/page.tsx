import { notFound } from 'next/navigation';
import { CHAT_ENABLED } from '@/lib/chat/types';
import { ChatReportsClient } from './ChatReportsClient';

export default function ChatReportsPage() {
  if (!CHAT_ENABLED) notFound();
  return <ChatReportsClient />;
}
