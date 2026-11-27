import { notFound } from 'next/navigation';
import { ChatPreview } from './ChatPreview';

export const metadata = { title: 'Chat preview', robots: { index: false, follow: false } };

/** The chat screens with made-up data, for checking the design on a developer's computer only. */
export default function ChatPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ChatPreview />;
}
