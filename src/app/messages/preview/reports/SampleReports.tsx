'use client';

import { useMemo } from 'react';
import { ReportQueue, type ReportSource } from '@/components/chat/ReportQueue';
import { TrialAccess, type TrialSource } from '@/components/chat/TrialAccess';
import { URGENT, openQueue, shapeReports, type ReportRow, type ReportedGroup, type Suspension } from '@/lib/chat/reports';

/** Made-up reports held in memory, run through the same shaping and ordering as the real ones. */
function sampleSource(): ReportSource {
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
  const base = { details: '', handled_by: null, handled_at: null, admin_note: '', status: 'open' as const };
  const rows: ReportRow[] = [
    { ...base, id: 'r1', reporter_id: 'kemi', reported_id: 'sam', reason: 'spam', created_at: ago(30), details: 'Keeps sending the same offer.',
      evidence: [{ id: 1, sender_id: 'sam', body: 'Cheap past questions, pay me now: www.example.com', created_at: ago(31) }] },
    { ...base, id: 'r2', reporter_id: 'ada', reported_id: 'sam', reason: 'underage', created_at: ago(2),
      evidence: [{ id: 2, sender_id: 'ada', body: 'Which class are you in?', created_at: ago(3) }, { id: 3, sender_id: 'sam', body: 'This is a sample reply for the preview.', created_at: ago(2.5) }] },
    { ...base, id: 'r3', reporter_id: null, reported_id: 'tunde', reason: 'harassment', created_at: ago(8),
      evidence: [{ id: 4, sender_id: 'tunde', body: 'Sample unkind message.', created_at: ago(9) }] },
  ];
  const people = new Map([
    ['kemi', { name: 'Kemi Adeyemi', handle: 'kemi-writes' }], ['ada', { name: 'Ada Nwosu', handle: null }],
    ['sam', { name: 'Sample Account', handle: null }], ['tunde', { name: 'Tunde Okafor', handle: null }],
  ]);
  rows.push({ ...base, id: 'r4', reporter_id: 'ada', reported_id: 'tunde', reason: 'scam', created_at: ago(5), group_id: 'g1', details: 'Asking members for money.',
    evidence: [{ id: 5, sender_id: 'kemi', body: 'Is this part of the course?', created_at: ago(6) }, { id: 6, sender_id: 'tunde', body: 'Sample message asking for payment.', created_at: ago(5.5) }] });
  const groups = new Map<string, ReportedGroup>([['g1', { id: 'g1', name: 'Exam study circle', visibility: 'private', closed: false }]]);
  const held = new Map<string, Suspension>();
  return {
    load: async status => {
      const counts = new Map<string, number>();
      for (const r of rows) if (r.reported_id) counts.set(r.reported_id, (counts.get(r.reported_id) || 0) + 1);
      const total = (s: string) => rows.filter(r => r.status === s).length;
      const inStatus = rows.filter(r => r.status === status);
      const page = status === 'open'
        ? await openQueue(async (urgent, limit) => inStatus.filter(r => URGENT.includes(r.reason) === urgent).sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, limit), 50)
        : inStatus;
      return { reports: shapeReports(page, people, counts, held, groups), suspensions: Array.from(held.values()), totals: { open: total('open'), reviewed: total('reviewed'), closed: total('closed') }, pageSize: 50 };
    },
    closeGroup: async groupId => {
      const g = groups.get(groupId);
      if (!g || g.closed) throw new Error('This group is already closed or removed.');
      g.closed = true;
    },
    setSuspension: async (userId, action, reason) => {
      if (action === 'restore') { held.delete(userId); return; }
      if (held.has(userId)) throw new Error('This person is already suspended.');
      held.set(userId, { userId, person: people.get(userId) || { name: 'Reader', handle: null }, reason, by: 'admin@example.com', at: new Date().toISOString() });
    },
    update: async (id, status, note) => {
      const row = rows.find(r => r.id === id);
      if (!row) throw new Error('Report not found');
      Object.assign(row, { status, admin_note: note.trim(), handled_by: 'admin@example.com', handled_at: new Date().toISOString() });
    },
  };
}

function sampleTrial(): TrialSource {
  let inviteOnly = true;
  let invites = [{ email: 'kemi@example.com', addedBy: 'admin@example.com', at: new Date().toISOString() }];
  return {
    load: async () => ({ inviteOnly, invites: [...invites] }),
    add: async email => { const e = email.trim().toLowerCase(); if (!invites.some(i => i.email === e)) invites.unshift({ email: e, addedBy: 'admin@example.com', at: new Date().toISOString() }); },
    remove: async email => { invites = invites.filter(i => i.email !== email); },
    setInviteOnly: async on => { inviteOnly = on; },
  };
}

export function SampleReports() {
  const source = useMemo(sampleSource, []);
  const trial = useMemo(sampleTrial, []);
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <p className="mb-3 text-xs font-semibold text-amber-300">Admin preview with made-up reports. Nothing is saved.</p>
        <TrialAccess source={trial} />
        <ReportQueue source={source} />
      </div>
    </div>
  );
}
