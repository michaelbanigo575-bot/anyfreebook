'use client';

import { useCallback, useEffect, useState } from 'react';
import { OFFICIAL_DOMAIN, OFFICIAL_NAME, WELCOME_LIMIT, isOfficialEmail, type WelcomeState } from '@/lib/chat/welcome';

export interface WelcomeSource {
  load(): Promise<WelcomeState>;
  save(body: string, enabled: boolean, senderEmail: string): Promise<void>;
  /** Returns how many were sent. */
  sendExisting(): Promise<number>;
}

const button = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50';
const solid = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-indigo-600 text-white disabled:opacity-50';

export function WelcomeMessage({ source }: { source: WelcomeSource }) {
  const [state, setState] = useState<WelcomeState | null>(null);
  const [body, setBody] = useState('');
  const [from, setFrom] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const next = await source.load(); setState(next); setBody(next.body); setFrom(next.senderIsOfficial ? next.senderEmail || '' : ''); }
    catch (e) { setError((e as Error).message || 'Could not load the welcome message.'); }
  }, [source]);
  useEffect(() => { load(); }, [load]);

  const act = async (work: () => Promise<string>) => {
    setBusy(true); setError(''); setNote('');
    try { const done = await work(); await load(); setNote(done); }
    catch (e) { setError((e as Error).message || 'That didn’t work.'); }
    setBusy(false);
    setConfirm(false);
  };
  const official = !!state?.senderIsOfficial;
  const changed = !!state && (body !== state.body || from.trim().toLowerCase() !== (official ? state.senderEmail || '' : ''));
  const ready = !!body.trim() && isOfficialEmail(from);

  return (
    <details className="max-w-3xl mb-4 rounded-2xl border border-slate-800 bg-slate-900/40 px-4">
      <summary className="min-h-[44px] flex items-center cursor-pointer text-sm font-semibold text-white">
        Welcome message: {state ? (state.enabled ? 'on' : 'off') : 'loading…'}
      </summary>
      <div className="pb-4 space-y-3">
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
        {note && <p role="status" className="text-sm text-emerald-300">{note}</p>}
        {state && (
          <>
            <p className="text-xs text-slate-400">
              Sent as a direct message from <strong className="text-slate-200">{OFFICIAL_NAME}</strong> when someone turns chat on. To read replies, sign in as the team account.
            </p>
            {state.enabled && !official && <p role="alert" className="text-sm text-amber-300">It is currently sent from {state.senderName}, a personal account. Choose the team account and save, or switch it off.</p>}
            <label className="block text-xs text-slate-400">Team account email (ends in {OFFICIAL_DOMAIN})
              <input type="email" value={from} onChange={e => setFrom(e.target.value)} maxLength={254} placeholder={`hello${OFFICIAL_DOMAIN}`} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            </label>
            <p className="text-[11px] text-slate-500">Saving names that account {OFFICIAL_NAME}. It must already exist and have messages turned on.</p>
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={WELCOME_LIMIT} rows={14} aria-label="Welcome message" className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            <p className="text-[11px] text-slate-500">{body.length} of {WELCOME_LIMIT} characters. Each person gets it once. Changing the words doesn’t send it again.</p>
            <div className="flex flex-wrap gap-2">
              {state.enabled ? (
                <>
                  <button type="button" disabled={busy || !ready || !changed} onClick={() => act(async () => { await source.save(body, true, from); return 'Saved'; })} className={solid}>Save changes</button>
                  <button type="button" disabled={busy} onClick={() => act(async () => { await source.save(body, false, from); return 'Welcome message switched off'; })} className={button}>Switch off</button>
                </>
              ) : <button type="button" disabled={busy || !ready} onClick={() => act(async () => { await source.save(body, true, from); return 'Welcome message switched on'; })} className={solid}>Save and switch on</button>}
            </div>
            {state.enabled && official && state.waiting > 0 && !changed && (!confirm
              ? <button type="button" disabled={busy} onClick={() => setConfirm(true)} className={button}>Send to {state.waiting} existing {state.waiting === 1 ? 'member' : 'members'}</button>
              : (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <p className="text-sm text-slate-100">Send this message now to {state.waiting} {state.waiting === 1 ? 'person who' : 'people who'} turned chat on earlier? It can’t be unsent.</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => act(async () => { const n = await source.sendExisting(); return `Sent to ${n} ${n === 1 ? 'person' : 'people'}`; })} className={solid}>Confirm: send</button>
                    <button type="button" onClick={() => setConfirm(false)} className={button}>Cancel</button>
                  </div>
                </div>
              ))}
            {state.enabled && state.waiting === 0 && <p className="text-xs text-slate-400">Every current member who can receive it has had it.</p>}
          </>
        )}
      </div>
    </details>
  );
}
