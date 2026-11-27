'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TrialState { inviteOnly: boolean; invites: { email: string; addedBy: string; at: string }[] }
export interface TrialSource {
  load(): Promise<TrialState>;
  add(email: string): Promise<void>;
  remove(email: string): Promise<void>;
  setInviteOnly(on: boolean): Promise<void>;
}

const button = 'min-h-[40px] rounded-lg px-4 text-xs font-semibold border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50';

/** Who may use chat during the trial. */
export function TrialAccess({ source }: { source: TrialSource }) {
  const [state, setState] = useState<TrialState | null>(null);
  const [email, setEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setState(await source.load()); }
    catch (e) { setError((e as Error).message || 'Could not load the trial list.'); }
  }, [source]);
  useEffect(() => { load(); }, [load]);

  const act = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); await load(); return true; }
    catch (e) { setError((e as Error).message || 'Could not save the change.'); return false; }
    finally { setBusy(false); }
  };

  return (
    <details className="max-w-3xl mb-4 rounded-2xl border border-slate-800 bg-slate-900/40 px-4">
      <summary className="min-h-[44px] flex items-center cursor-pointer text-sm font-semibold text-white">
        Who can use chat: {state ? (state.inviteOnly ? `invited people only (${state.invites.length})` : 'everyone who is signed in') : 'loading…'}
      </summary>
      <div className="pb-4 space-y-3">
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
        {state && (
          <>
            <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (await act(() => source.add(email))) setEmail(''); }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} aria-label="Email to invite" placeholder="Email to invite" className="flex-1 min-w-0 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" />
              <button type="submit" disabled={busy || !email.trim()} className="min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-indigo-600 text-white disabled:opacity-50">Invite</button>
            </form>
            <p className="text-xs text-slate-400">Adding an address doesn’t send an email. Tell the person yourself. They must sign in with that confirmed address, be 18 or over and accept the rules.</p>
            <ul className="space-y-1.5 max-h-60 overflow-y-auto">
              {state.invites.map(i => (
                <li key={i.email} className="flex items-center gap-2 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5">
                  <span className="flex-1 min-w-0 truncate text-sm text-slate-100">{i.email}</span>
                  <button type="button" disabled={busy} onClick={() => act(() => source.remove(i.email))} className={button}>Remove</button>
                </li>
              ))}
              {state.invites.length === 0 && <li className="text-sm text-slate-500">Nobody is invited yet.</li>}
            </ul>
            {!state.inviteOnly ? <button type="button" disabled={busy} onClick={() => act(() => source.setInviteOnly(true))} className={button}>Limit to invited people again</button>
              : !confirmOpen ? <button type="button" onClick={() => setConfirmOpen(true)} className={button}>Open chat to everyone</button> : (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                  <p className="text-sm text-rose-100">Every signed-in person will be able to turn chat on. Are reports being checked regularly?</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={async () => { if (await act(() => source.setInviteOnly(false))) setConfirmOpen(false); }} className="min-h-[40px] rounded-lg px-4 text-xs font-semibold bg-rose-600 text-white">Confirm: open to everyone</button>
                    <button type="button" onClick={() => setConfirmOpen(false)} className={button}>Cancel</button>
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </details>
  );
}
