'use client';

import { useMemo, useState } from 'react';
import { GroupScreen, type GroupView } from '@/components/chat/GroupScreen';
import { sampleGroupApi } from '@/lib/chat/sampleGroupApi';

export function GroupPreview() {
  const [suspended, setSuspended] = useState(false);
  const api = useMemo(() => sampleGroupApi({ suspended }), [suspended]);
  const [view, setView] = useState<GroupView>({ kind: 'list' });
  return (
    <>
      <p className="content-wrapper pt-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
        Preview with sample people. Nothing is saved or sent.{' '}
        <button type="button" onClick={() => setView({ kind: 'invite', token: 'sample-g4' })} className="underline">Try an invite link</button>{' · '}
        <button type="button" onClick={() => api.receive('g1', 'A new sample group message.')} className="underline">Make a member send</button>{' · '}
        <button type="button" onClick={() => api.study.samplePresent('g1')} className="underline">Make a member present</button>{' · '}
        <button type="button" onClick={() => { setSuspended(s => !s); setView({ kind: 'list' }); }} className="underline">{suspended ? 'Preview normal account' : 'Preview suspended account'}</button>
      </p>
      <GroupScreen api={api} view={view} onView={setView} />
    </>
  );
}
