'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { REPORT_STATUSES, type Report, type ReportStatus, type Suspension } from '@/lib/chat/reports';

export interface ReportSource {
  load(status: ReportStatus): Promise<{ reports: Report[]; suspensions: Suspension[]; totals: Record<ReportStatus, number>; pageSize: number }>;
  update(id: string, status: ReportStatus, note: string): Promise<void>;
  closeGroup(groupId: string, reason: string, reportId: string): Promise<void>;
  setSuspension(userId: string, action: 'suspend' | 'restore', reason: string, reportId: string | null): Promise<void>;
}

/** Suspend or restore, always with a written reason and a second click to confirm. */
function SuspendControl({ name, suspended, onConfirm }: { name: string; suspended: boolean; onConfirm: (reason: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const verb = suspended ? 'Restore chat' : 'Suspend chat';
  const danger = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-rose-600 text-white disabled:opacity-50';

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={suspended ? button : `${button} !border-rose-500/60 !text-rose-300`}>{verb}</button>;
  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3">
      <p className="text-sm font-semibold text-white">{verb} for {name}?</p>
      <p className="mt-1 text-xs text-slate-400">
        {suspended ? 'They will be able to send, start and accept chats again.' : 'They won’t be able to send, start or accept chats. They can still read, block and report. They are told it is suspended, not who did it or your reason.'}
      </p>
      <label className="block mt-2 text-xs text-slate-400">Reason (required, only admins see it)
        <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={2} autoFocus className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" />
      </label>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} className={suspended ? solid : danger}
          onClick={async () => { setBusy(true); const done = await onConfirm(reason.trim()); setBusy(false); if (done) { setOpen(false); setReason(''); } }}>
          Confirm: {verb.toLowerCase()}
        </button>
        <button type="button" onClick={() => { setOpen(false); setReason(''); }} className={button}>Cancel</button>
      </div>
    </div>
  );
}

/** Closing a group is final, so it needs a written reason and a second click. */
function CloseGroupControl({ name, onConfirm }: { name: string; onConfirm: (reason: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${button} !border-rose-500/60 !text-rose-300`}>Close group</button>;
  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3">
      <p className="text-sm font-semibold text-white break-words">Close the group “{name}”?</p>
      <p className="mt-1 text-xs text-slate-400">No member will be able to read or write in it or its Study Room again. This cannot be undone.</p>
      <label className="block mt-2 text-xs text-slate-400">Reason (required, only admins see it)
        <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={2} autoFocus className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white" />
      </label>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} className="min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-rose-600 text-white disabled:opacity-50"
          onClick={async () => { setBusy(true); const done = await onConfirm(reason.trim()); setBusy(false); if (done) { setOpen(false); setReason(''); } }}>
          Confirm: close group
        </button>
        <button type="button" onClick={() => { setOpen(false); setReason(''); }} className={button}>Cancel</button>
      </div>
    </div>
  );
}

const button = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50';
const solid = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-indigo-600 text-white disabled:opacity-50';

const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Card({ report, onUpdate, onSuspension, onCloseGroup }: { onCloseGroup: (reason: string) => Promise<boolean>; report: Report; onUpdate: (status: ReportStatus, note: string) => Promise<void>; onSuspension: (action: 'suspend' | 'restore', reason: string) => Promise<boolean> }) {
  const [note, setNote] = useState(report.note);
  const [busy, setBusy] = useState(false);
  // private messages stay folded away until the admin chooses to read them
  const [reading, setReading] = useState(false);
  const act = async (status: ReportStatus) => { setBusy(true); await onUpdate(status, note); setBusy(false); };

  return (
    <article className={`rounded-2xl bg-slate-900/40 border p-4 ${report.urgent && report.status === 'open' ? 'border-rose-500/60' : 'border-slate-800'}`}>
      <div className="flex flex-wrap items-center gap-2">
        {report.urgent && <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-bold">Urgent</span>}
        <h2 className="text-sm font-bold text-white">{report.reason}</h2>
        <span className="ml-auto text-xs text-slate-500">{when(report.createdAt)}</span>
      </div>
      {report.group && (
        <p className="mt-2 text-xs text-slate-300 break-words">
          <span className="font-bold text-indigo-300">Group:</span> {report.group.name}
          {report.group.visibility && ` · ${report.group.visibility}`}
          {report.group.closed && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">Closed</span>}
        </p>
      )}
      <dl className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
        {([['Reported person', report.reported], ['Reported by', report.reporter]] as const).map(([label, p]) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="text-slate-200 break-words">
              {p.handle ? <a href={`/author/${p.handle}`} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">{p.name}</a> : p.name}
            </dd>
          </div>
        ))}
      </dl>
      {report.reportsAboutPerson > 1 && <p className="mt-2 text-xs font-semibold text-amber-300">{report.reportsAboutPerson} reports name this person.</p>}
      {report.details && <p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap break-words">“{report.details}”</p>}
      {report.suspension && (
        <p className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-200 break-words">
          Chat suspended by {report.suspension.by} on {when(report.suspension.at)}. Reason: {report.suspension.reason}
        </p>
      )}

      <button type="button" onClick={() => setReading(r => !r)} aria-expanded={reading} className={`${button} mt-3`}>
        {reading ? 'Hide messages' : `Read ${report.messages.length} reported message${report.messages.length === 1 ? '' : 's'}`}
      </button>
      {reading && (
        <ol className="mt-2 max-h-80 overflow-y-auto space-y-2 rounded-xl bg-slate-950 border border-slate-800 p-3">
          {report.messages.map(m => (
            <li key={m.id} className={`rounded-lg px-3 py-2 ${m.from === 'reported' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-slate-800/60'}`}>
              <p className="text-[11px] text-slate-400">{m.from === 'reported' ? `${report.reported.name} (reported)` : m.from === 'reporter' ? report.reporter.name : 'Another member'} · {when(m.at)}</p>
              {/* plain text: a link in a reported message is never clickable here */}
              <p className="text-sm text-slate-100 whitespace-pre-wrap break-words">{m.body}</p>
            </li>
          ))}
          {report.messages.length === 0 && <li className="text-sm text-slate-500">No messages were saved with this report.</li>}
        </ol>
      )}

      <label className="block mt-3 text-xs text-slate-400">Your note (only admins see it)
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {report.status !== 'reviewed' && <button type="button" disabled={busy} onClick={() => act('reviewed')} className={solid}>Mark reviewed</button>}
        {report.status !== 'closed' && <button type="button" disabled={busy} onClick={() => act('closed')} className={button}>Close</button>}
        {report.status !== 'open' && <button type="button" disabled={busy} onClick={() => act('open')} className={button}>Reopen</button>}
        {note !== report.note && <button type="button" disabled={busy} onClick={() => act(report.status)} className={button}>Save note</button>}
      </div>
      {report.group && !report.group.closed && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
          <CloseGroupControl name={report.group.name} onConfirm={onCloseGroup} />
        </div>
      )}
      {report.reportedId && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
          <SuspendControl key={report.suspension ? 'restore' : 'suspend'} name={report.reported.name} suspended={!!report.suspension}
            onConfirm={reason => onSuspension(report.suspension ? 'restore' : 'suspend', reason)} />
        </div>
      )}
      {report.handledBy && report.handledAt && <p className="mt-2 text-[11px] text-slate-500">Last updated by {report.handledBy} on {when(report.handledAt)}</p>}
    </article>
  );
}

export function ReportQueue({ source }: { source: ReportSource }) {
  const [status, setStatus] = useState<ReportStatus>('open');
  const [reports, setReports] = useState<Report[] | null>(null);
  const [totals, setTotals] = useState<Record<ReportStatus, number>>({ open: 0, reviewed: 0, closed: 0 });
  const [pageSize, setPageSize] = useState(50);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const latest = useRef(0);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    setError('');
    try {
      const data = await source.load(status);
      // a slow answer for a tab the admin has left is ignored
      if (mine !== latest.current) return;
      setReports(data.reports); setSuspensions(data.suspensions); setTotals(data.totals); setPageSize(data.pageSize);
    } catch (e) {
      if (mine === latest.current) { setReports([]); setError((e as Error).message || 'Could not load reports.'); }
    }
  }, [source, status]);

  useEffect(() => { setReports(null); load(); }, [load]);

  const suspend = async (userId: string, action: 'suspend' | 'restore', reason: string, reportId: string | null) => {
    setError(''); setNote('');
    try {
      await source.setSuspension(userId, action, reason, reportId);
      setNote(action === 'suspend' ? 'Chat suspended' : 'Chat restored');
      await load();
      return true;
    } catch (e) {
      const message = (e as Error).message || 'Could not change the suspension.';
      await load();
      setError(message);
      return false;
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-slate-400">Reports include private messages. Read them only to deal with the report, and don’t copy or share them.</p>
      {/* listed here too, so someone can be restored even when none of their reports is on screen */}
      {suspensions.length > 0 && (
        <details className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4">
          <summary className="min-h-[44px] flex items-center cursor-pointer text-sm font-semibold text-white">Suspended from chat ({suspensions.length})</summary>
          <ul className="pb-3 space-y-2">
            {suspensions.map(x => (
              <li key={x.userId} className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-wrap items-start gap-2">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-slate-100 break-words">{x.person.name}</p>
                  <p className="text-xs text-slate-400 break-words">{x.reason}</p>
                  <p className="text-[11px] text-slate-500">{x.by} · {when(x.at)}</p>
                </div>
                <SuspendControl name={x.person.name} suspended onConfirm={reason => suspend(x.userId, 'restore', reason, null)} />
              </li>
            ))}
          </ul>
        </details>
      )}
      <div role="tablist" className="grid grid-cols-3 gap-2">
        {REPORT_STATUSES.map(s => (
          <button key={s} role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setNote(''); }}
            className={`min-h-[56px] rounded-xl border text-left px-3 ${status === s ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/40'}`}>
            <span className="block text-lg font-mono font-bold text-white">{totals[s]}</span>
            <span className="block text-xs capitalize text-slate-400">{s}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-amber-300">{error} <button type="button" onClick={load} className="underline">Try again</button></p>}
      {note && <p role="status" className="text-sm text-emerald-300">{note}</p>}
      {reports === null && <p className="text-sm text-slate-400">Loading reports…</p>}
      {reports?.length === 0 && !error && <p className="py-8 text-center text-sm text-slate-400">No {status} reports.</p>}
      {reports?.map(r => (
        <Card key={r.id} report={r} onCloseGroup={async reason => {
          setError(''); setNote('');
          try {
            await source.closeGroup(r.group!.id, reason, r.id);
            setNote('Group closed');
            await load();
            return true;
          } catch (e) {
            const message = (e as Error).message || 'Could not close the group.';
            await load();
            setError(message);
            return false;
          }
        }} onSuspension={(action, reason) => suspend(r.reportedId!, action, reason, r.id)} onUpdate={async (next, text) => {
          setError(''); setNote('');
          try {
            await source.update(r.id, next, text);
            setNote(next === r.status ? 'Note saved' : next === 'open' ? 'Report reopened' : `Report marked ${next}`);
            await load();
          } catch (e) { setError((e as Error).message || 'Could not update the report.'); }
        }} />
      ))}
      {!!reports?.length && totals[status] > pageSize && <p className="text-xs text-slate-500">Showing {pageSize} of {totals[status]}. Deal with these to see the rest.</p>}
    </div>
  );
}
