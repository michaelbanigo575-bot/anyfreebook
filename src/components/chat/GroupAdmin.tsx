'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { chatErrorText } from '@/lib/chat/types';
import {
  PERMISSIONS, RULES_LIMIT, SESSION_LENGTHS, SLOW_OPTIONS,
  type GroupApi, type GroupControls, type GroupSession, type Permission, type PinnedMessage, type Role,
} from '@/lib/chat/groups';
import { card, outline, primary } from './ChatScreen';

const field = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-[16px] text-[var(--text)]';
const heading = 'mt-5 mb-2 text-sm font-bold text-[var(--text)]';

export const NO_CONTROLS: GroupControls = { rules: '', adminsOnly: false, slowSeconds: 0, can: [], timedOutUntil: null };

export const fullDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export interface Extras { controls: GroupControls; roles: Map<string, Role>; pins: PinnedMessage[]; sessions: GroupSession[] }

/** The group's settings, roles, pins and coming sessions. Reloaded whenever `tick` rises. */
export function useGroupExtras(api: GroupApi, groupId: string, tick: number) {
  const [extras, setExtras] = useState<Extras>({ controls: NO_CONTROLS, roles: new Map(), pins: [], sessions: [] });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const [controls, roles, pins, sessions] = await Promise.all([api.controls(groupId), api.roles(groupId), api.pinned(groupId), api.upcoming(groupId)]);
      if (mine === latest.current) setExtras({ controls, roles: new Map(roles.map(r => [r.id, r])), pins, sessions });
    } catch { /* what is on screen stays; the database still enforces every rule */ }
  }, [api, groupId]);
  useEffect(() => { reload(); }, [reload, tick]);
  return { ...extras, reload };
}

/** Pinned messages and the next study session, above the chat. */
export function GroupBanner({ pins, sessions, canUnpin, onUnpin }: { pins: PinnedMessage[]; sessions: GroupSession[]; canUnpin: boolean; onUnpin: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const next = sessions[0];
  if (!pins.length && !next) return null;
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5">
      {next && (
        <p className="py-1 text-xs text-[var(--text)] break-words">
          <span className="font-bold text-[var(--primary)]">{new Date(next.startsAt).getTime() <= Date.now() ? 'Studying now: ' : 'Next study session: '}</span>
          {next.title} · {fullDate(next.startsAt)}
        </p>
      )}
      {pins.length > 0 && (
        <>
          <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="w-full min-h-[36px] flex items-center gap-2 text-left text-xs">
            <span className="font-bold text-[var(--primary)] flex-shrink-0">📌 {pins.length === 1 ? 'Pinned' : `${pins.length} pinned`}</span>
            {!open && <span className="flex-1 min-w-0 truncate text-[var(--text-secondary)]">{pins[0].body}</span>}
            <span aria-hidden className="ml-auto text-[var(--text-muted)]">{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <ul className="max-h-44 overflow-y-auto space-y-1.5 pb-1">
              {pins.map(p => (
                <li key={p.id} className="flex items-start gap-2 rounded-lg bg-[var(--bg-secondary)] p-2">
                  <p className="flex-1 min-w-0 text-xs text-[var(--text)] whitespace-pre-wrap break-words"><span className="font-semibold">{p.sender}: </span>{p.body}</p>
                  {canUnpin && <button type="button" onClick={() => onUnpin(p.id)} className="min-h-[32px] px-2 text-xs font-semibold text-[var(--primary)]">Unpin</button>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function StudySessions({ api, groupId, sessions, canPlan, onChanged, say }: {
  api: GroupApi; groupId: string; sessions: GroupSession[]; canPlan: boolean; onChanged: () => Promise<void>; say: (t: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [start, setStart] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (work: () => Promise<unknown>, done: string) => {
    setError(''); setBusy(true);
    try { await work(); say(done); await onChanged(); return true; }
    catch (e) { setError(chatErrorText(e, 'group')); return false; }
    finally { setBusy(false); }
  };
  return (
    <>
      <h3 className={heading}>Study sessions</h3>
      <p className="text-xs text-[var(--text-muted)] mb-2">A time to study together. Joining is always optional.</p>
      {sessions.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nothing planned yet.</p>}
      <ul className="space-y-2">
        {sessions.map(s => (
          <li key={s.id} className={`${card} p-3`}>
            <p className="font-semibold text-sm text-[var(--text)] break-words">{s.title}</p>
            <p className="text-xs text-[var(--primary)]">{fullDate(s.startsAt)} · {s.minutes} minutes</p>
            {s.note && <p className="mt-1 text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words">{s.note}</p>}
            {canPlan && <button type="button" disabled={busy} onClick={() => act(() => api.cancelSession(groupId, s.id), 'Session cancelled')} className="mt-1 min-h-[36px] text-xs font-semibold text-red-600">Cancel session</button>}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {canPlan && (adding ? (
        <form className={`${card} p-3 mt-2 space-y-2`} onSubmit={async e => {
          e.preventDefault();
          const when = new Date(start);
          if (Number.isNaN(when.getTime())) { setError('Choose a date and time.'); return; }
          if (await act(() => api.schedule(groupId, { title, note, startsAt: when.toISOString(), minutes }), 'Session planned')) { setAdding(false); setTitle(''); setNote(''); setStart(''); }
        }}>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} aria-label="Session title" placeholder="What will you study?" className={field} />
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">Starts
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={`${field} mt-1`} />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">Length
            <select value={minutes} onChange={e => setMinutes(Number(e.target.value))} className={`${field} mt-1`}>
              {SESSION_LENGTHS.map(m => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2} aria-label="Session note" placeholder="What to bring or read (optional)" className={field} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAdding(false)} className={outline}>Cancel</button>
            <button type="submit" disabled={busy || title.trim().length < 3 || !start} className={primary}>Plan session</button>
          </div>
        </form>
      ) : <button type="button" onClick={() => setAdding(true)} className={`${outline} mt-2`}>+ Plan a session</button>)}
    </>
  );
}

export function GroupSettingsForm({ api, groupId, controls, onChanged, say }: {
  api: GroupApi; groupId: string; controls: GroupControls; onChanged: () => Promise<void>; say: (t: string) => void;
}) {
  const [rules, setRules] = useState(controls.rules);
  const [adminsOnly, setAdminsOnly] = useState(controls.adminsOnly);
  const [slow, setSlow] = useState(controls.slowSeconds);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // show the saved values when they arrive or change, without wiping what is being typed
  useEffect(() => { setRules(controls.rules); setAdminsOnly(controls.adminsOnly); setSlow(controls.slowSeconds); }, [controls.rules, controls.adminsOnly, controls.slowSeconds]);
  const changed = rules !== controls.rules || adminsOnly !== controls.adminsOnly || slow !== controls.slowSeconds;
  return (
    <>
      <h3 className={heading}>Admin settings</h3>
      <form className={`${card} p-3 space-y-3`} onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try { await api.saveSettings(groupId, { rules, adminsOnly, slowSeconds: slow }); say('Settings saved'); await onChanged(); }
        catch (err) { setError(chatErrorText(err, 'group')); }
        setBusy(false);
      }}>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">Group rules
          <textarea value={rules} onChange={e => setRules(e.target.value)} maxLength={RULES_LIMIT} rows={3} placeholder="For example: be kind, and stay on the subject." className={`${field} mt-1`} />
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={adminsOnly} onChange={e => setAdminsOnly(e.target.checked)} />
          <span><span className="block text-sm font-semibold text-[var(--text)]">Only staff can post</span><span className="block text-xs text-[var(--text-muted)]">You and helpers who can announce. Everyone can still read and react.</span></span>
        </label>
        <label className="block text-xs font-semibold text-[var(--text-secondary)]">Slow the chat down
          <select value={slow} onChange={e => setSlow(Number(e.target.value))} className={`${field} mt-1`}>
            {SLOW_OPTIONS.map(o => <option key={o.seconds} value={o.seconds}>{o.label}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy || !changed} className={`${primary} w-full`}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </>
  );
}

export function HelperPicker({ current, onSave }: { current: Permission[]; onSave: (p: Permission[]) => void }) {
  const [chosen, setChosen] = useState<Permission[]>(current);
  const same = chosen.length === current.length && chosen.every(p => current.includes(p));
  return (
    <fieldset className="rounded-xl border border-[var(--border-subtle)] p-3">
      <legend className="px-1 text-xs font-bold text-[var(--text)]">Helper powers</legend>
      {PERMISSIONS.map(p => (
        <label key={p.id} className="flex items-start gap-3 py-1">
          <input type="checkbox" className="mt-1" checked={chosen.includes(p.id)} onChange={e => setChosen(c => (e.target.checked ? [...c, p.id] : c.filter(x => x !== p.id)))} />
          <span><span className="block text-sm font-semibold text-[var(--text)]">{p.label}</span><span className="block text-xs text-[var(--text-muted)]">{p.text}</span></span>
        </label>
      ))}
      <button type="button" disabled={same} onClick={() => onSave(chosen)} className={`${primary} w-full mt-2`}>Save helper powers</button>
    </fieldset>
  );
}
