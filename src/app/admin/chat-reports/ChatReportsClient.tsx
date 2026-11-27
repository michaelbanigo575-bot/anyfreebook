'use client';

import { ReportQueue, type ReportSource } from '@/components/chat/ReportQueue';
import { TrialAccess, type TrialSource } from '@/components/chat/TrialAccess';

async function send(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: 'no-store', ...init }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  if (!res?.ok) throw new Error(data?.error || 'Check your connection.');
  return data;
}

const live: ReportSource = {
  load: status => send(`/api/admin/chat-reports?status=${status}`),
  update: async (id, status, note) => { await send('/api/admin/chat-reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, note }) }); },
  closeGroup: async (groupId, reason, reportId) => { await send('/api/admin/chat-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, action: 'close-group', reason, reportId }) }); },
  setSuspension: async (userId, action, reason, reportId) => { await send('/api/admin/chat-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action, reason, reportId }) }); },
};

const change = async (body: object) => { await send('/api/admin/chat-trial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); };

const trial: TrialSource = {
  load: () => send('/api/admin/chat-trial'),
  add: email => change({ action: 'add', email }),
  remove: email => change({ action: 'remove', email }),
  setInviteOnly: inviteOnly => change({ action: 'mode', inviteOnly }),
};

export function ChatReportsClient() {
  return (
    <>
      <TrialAccess source={trial} />
      <ReportQueue source={live} />
    </>
  );
}
