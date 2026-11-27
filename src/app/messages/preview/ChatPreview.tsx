'use client';

import { useMemo, useState } from 'react';
import { ChatScreen, type ChatView } from '@/components/chat/ChatScreen';
import { sampleChatApi } from '@/lib/chat/sampleApi';
import { MessagesIconLink, useUnreadCounts } from '@/components/chat/Unread';

export function ChatPreview() {
  const [suspended, setSuspended] = useState(false);
  const api = useMemo(() => sampleChatApi({ suspended }), [suspended]);
  const [view, setView] = useState<ChatView>({ kind: 'inbox' });
  const counts = useUnreadCounts(api);
  return (
    <>
      <p className="content-wrapper pt-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
        Preview with sample people. Nothing is saved or sent.{' '}
        <button type="button" onClick={() => setView({ kind: 'new', to: 'ada' })} className="underline">Try a new request</button>{' · '}
        <button type="button" onClick={() => { setSuspended(s => !s); setView({ kind: 'inbox' }); }} className="underline">{suspended ? 'Preview normal account' : 'Preview suspended account'}</button>{' · '}
        <button type="button" onClick={() => api.receive('t1', 'A new sample message.')} className="underline">Make Kemi send a message</button>
      </p>
      <div className="flex justify-center items-center gap-1 text-xs text-[var(--text-muted)]">Header badge: <MessagesIconLink counts={counts} /></div>
      <ChatScreen api={api} view={view} onView={setView} />
    </>
  );
}
