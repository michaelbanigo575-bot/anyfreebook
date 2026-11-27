'use client';

import { useCallback, useEffect, useState } from 'react';
import { WELCOME_LIMIT, type WelcomeState } from '@/lib/chat/welcome';

export interface WelcomeSource {
  load(): Promise<WelcomeState>;
  save(body: string, enabled: boolean): Promise<void>;
  /** Returns how many were sent. */
  sendExisting(): Promise<number>;
}

const button = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50';
const solid = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-indigo-600 text-white disabled:opacity-50';

export function WelcomeMessage({ source }: { source: WelcomeSource }) {
  const [state, setState] = useState<WelcomeState | null>(null);
  const [body, setBody] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const next = await source.load(); setState(next); setBody(next.body); }
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
  const changed = !!state && body !== state.body;

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
              Sent as a direct message when someone turns chat on. Saving sends it from <strong className="text-slate-200">your own account</strong>, and replies come to your Messages.
              {state.senderName && !state.senderIsMe && <span className="text-amber-300"> It is currently sent from {state.senderName}. Saving will change that to you.</span>}
            </p>
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={WELCOME_LIMIT} rows={14} aria-label="Welcome message" className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
            <p className="text-[11px] text-slate-500">{body.length} of {WELCOME_LIMIT} characters. Each person gets it once. Changing the words doesn’t send it again.</p>
            <div className="flex flex-wrap gap-2">
              {state.enabled ? (
                <>
                  <button type="button" disabled={busy || !body.trim() || (!changed && state.senderIsMe)} onClick={() => act(async () => { await source.save(body, true); return 'Saved'; })} className={solid}>Save changes</button>
                  <button type="button" disabled={busy} onClick={() => act(async () => { await source.save(body, false); return 'Welcome message switched off'; })} className={button}>Switch off</button>
                </>
              ) : <button type="button" disabled={busy || !body.trim()} onClick={() => act(async () => { await source.save(body, true); return 'Welcome message switched on'; })} className={solid}>Save and switch on</button>}
            </div>
            {state.enabled && state.waiting > 0 && !changed && (!confirm
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
