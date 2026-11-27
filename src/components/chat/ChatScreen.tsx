'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FocusPopup } from '@/components/ShareSheet';
import {
  MESSAGE_LIMIT, REPORT_REASONS, REQUEST_LIMIT, chatErrorText,
  type ChatApi, type Message, type Person, type ReportReason, type Thread,
} from '@/lib/chat/types';
import { CHAT_CHANGED, watchChat } from '@/lib/chat/watch';
import { Badge, groupsUnread, useChatUnread } from './Unread';

/** What is open: nothing, a conversation, a first message to someone, or settings. */
export type ChatView = { kind: 'inbox' } | { kind: 'thread'; id: string } | { kind: 'new'; to: string } | { kind: 'settings' };

export const primary = 'min-h-[46px] px-5 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold disabled:opacity-50';
export const outline = 'min-h-[46px] px-4 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50';
export const card = 'premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]';

const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?';

export function Avatar({ name, size = 'w-11 h-11' }: { name: string; size?: string }) {
  return <span aria-hidden className={`${size} flex-shrink-0 rounded-full bg-[#050F26] ring-2 ring-[#6EC1EA] text-white font-serif-title font-bold flex items-center justify-center`}>{initial(name)}</span>;
}

export function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** Back arrow for phones, where an open chat covers the whole screen. */
export function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back to messages" className="md:hidden w-11 h-11 -ml-2 flex items-center justify-center text-[var(--text)]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
    </button>
  );
}

export function Composer({ limit, label, placeholder, onSend }: { limit: number; label: string; placeholder: string; onSend: (body: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    // the words stay in the box if sending fails
    if (await onSend(text)) setText('');
    setBusy(false);
  };
  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }} className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface)]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-end gap-2">
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={limit} aria-label={label} placeholder={placeholder}
          // Enter sends with a physical keyboard; on phones Enter makes a new line
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); submit(); } }}
          className="flex-1 min-h-[46px] max-h-32 resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-[16px] text-[var(--text)]"
        />
        <button type="submit" disabled={busy || !text.trim()} className={primary}>{busy ? 'Sending…' : 'Send'}</button>
      </div>
      {limit === REQUEST_LIMIT && <p className="mt-1 text-right text-[11px] text-[var(--text-muted)]">{text.length}/{limit}</p>}
    </form>
  );
}

export function SuspendedNotice() {
  return (
    <p role="note" className="p-4 text-center text-sm text-[var(--text-secondary)] border-t border-[var(--border-subtle)] bg-[var(--surface)]">
      Your chat is suspended. You can still read, block and report. If you think this is a mistake, <Link href="/contact" className="font-semibold text-[var(--primary)]">contact us</Link>.
    </p>
  );
}

/** Switches between one-to-one chats and groups. */
export function MessagesSwitch({ active }: { active: 'chats' | 'groups' }) {
  // the developer preview keeps its own pair of addresses
  const base = (usePathname() || '').startsWith('/messages/preview') ? '/messages/preview' : '/messages';
  const counts = useChatUnread();
  const waiting = { chats: counts.messages + counts.requests, groups: groupsUnread(counts) };
  return (
    <nav aria-label="Message type" className="grid grid-cols-2 gap-1 mb-3 p-1 rounded-2xl bg-[var(--bg-secondary)]">
      {([['chats', 'Direct', base], ['groups', 'Groups', `${base}/groups`]] as const).map(([id, label, href]) => (
        <Link key={id} href={href} aria-current={active === id ? 'page' : undefined}
          className={`min-h-[40px] flex items-center justify-center rounded-xl text-sm font-bold ${active === id ? 'bg-[var(--surface)] text-[var(--text)] shadow' : 'text-[var(--text-muted)]'}`}>{label}<Badge count={waiting[id]} className="ml-1.5" /></Link>
      ))}
    </nav>
  );
}

function ReportDialog({ name, onClose, onSubmit }: { name: string; onClose: () => void; onSubmit: (r: ReportReason, details: string, alsoBlock: boolean) => Promise<void> }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <FocusPopup label={`Report ${name}`} onClose={onClose}>
      <div className="max-h-[75vh] overflow-y-auto">
        <p className="font-serif-title text-lg font-bold text-[var(--text)]">Report {name}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Our team receives a copy of the last 20 messages in this chat. {name} isn’t told who reported them.</p>
        <fieldset className="mt-3">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map(r => (
            <label key={r.id} className="flex items-center gap-3 min-h-[40px] text-sm text-[var(--text)]">
              <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />{r.label}
            </label>
          ))}
        </fieldset>
        <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={2} aria-label="More details" placeholder="More details (optional)" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-[16px] text-[var(--text)]" />
        <label className="flex items-center gap-3 min-h-[40px] text-sm text-[var(--text)]"><input type="checkbox" checked={alsoBlock} onChange={e => setAlsoBlock(e.target.checked)} />Also block {name}</label>
        <button type="button" disabled={!reason || busy} onClick={async () => { setBusy(true); await onSubmit(reason!, details, alsoBlock); setBusy(false); }} className={`${primary} w-full mt-2`}>{busy ? 'Sending…' : 'Send report'}</button>
      </div>
    </FocusPopup>
  );
}

function Conversation({ api, thread, suspended, onBack, onChanged, say }: { api: ChatApi; suspended: boolean; thread: Thread; onBack: () => void; onChanged: (closed?: boolean) => Promise<void>; say: (text: string) => void }) {
  const [log, setLog] = useState<Message[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<'block' | 'report' | null>(null);
  const [error, setError] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastSeen = useRef(0);
  const latest = useRef(0);
  const [newBelow, setNewBelow] = useState(false);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const next = await api.messages(thread.id);
      if (mine === latest.current) setLog(next);
    } catch (e) {
      // a failed refresh keeps the messages already on screen
      if (mine === latest.current) { setError(chatErrorText(e)); setLog(current => current ?? []); }
    }
  }, [api, thread.id]);

  const toBottom = () => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
    atBottom.current = true;
    setNewBelow(false);
  };

  useEffect(() => {
    setLog(null); setError('');
    load();
  }, [thread.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Looking at a request does not mark it. An open, accepted chat counts as read only while the page
  // is actually in view, so a message arriving in a background tab stays unread until someone looks.
  useEffect(() => {
    if (thread.isRequest || thread.unread < 1) return;
    let done = false;
    const mark = () => {
      if (done || document.visibilityState !== 'visible') return;
      done = true;
      api.markRead(thread.id).then(() => onChanged()).catch(() => { done = false; });
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [thread.id, thread.isRequest, thread.unread]); // eslint-disable-line react-hooks/exhaustive-deps

  // New messages found by the inbox check are loaded into the open chat
  useEffect(() => {
    if (log !== null) load();
  }, [thread.lastAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow new messages only if the reader is at the bottom, or the newest one is their own.
  // Someone reading older messages is not pulled away from them.
  useEffect(() => {
    const newest = log?.[log.length - 1];
    if (!newest || newest.id === lastSeen.current) return;
    const first = lastSeen.current === 0;
    lastSeen.current = newest.id;
    if (first || atBottom.current || newest.mine) toBottom();
    else setNewBelow(true);
  }, [log]);

  const act = async (work: () => Promise<unknown>, done?: string, closes = false) => {
    setError('');
    try { await work(); if (done) say(done); await onChanged(closes); return true; }
    catch (e) { setError(chatErrorText(e)); return false; }
  };

  const waiting = thread.status === 'pending' && !thread.isRequest;

  return (
    <section aria-label={`Chat with ${thread.name}`} className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <Back onClick={onBack} />
        <Avatar name={thread.name} size="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[var(--text)] truncate">{thread.name}</h2>
          {thread.handle && <Link href={`/author/${thread.handle}`} className="text-xs text-[var(--primary)]">View profile</Link>}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-label="Chat options" className="w-11 h-11 rounded-xl text-xl text-[var(--text)] hover:bg-[var(--surface-hover)]">⋯</button>
          {menu && (
            <div className="absolute right-0 top-full z-10 w-44 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
              <button type="button" onClick={() => { setMenu(false); setDialog('report'); }} className="w-full min-h-[44px] px-3 text-left text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)]">Report</button>
              <button type="button" onClick={() => { setMenu(false); setDialog('block'); }} className="w-full min-h-[44px] px-3 text-left text-sm text-red-600 rounded-lg hover:bg-[var(--surface-hover)]">Block</button>
            </div>
          )}
        </div>
      </header>

      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2" aria-live="polite"
        onScroll={e => {
          const box = e.currentTarget;
          atBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
          if (atBottom.current) setNewBelow(false);
        }}>
        {log === null && <p className="text-center text-sm text-[var(--text-muted)] py-8">Loading messages…</p>}
        {log?.map(m => (
          <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${m.mine ? 'rounded-br-md bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white' : 'rounded-bl-md bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text)]'}`}>
              <span className="sr-only">{m.mine ? 'You said: ' : `${thread.name} said: `}</span>
              {/* plain text only: links are never turned into something you can tap by accident */}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[10px] text-right ${m.mine ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>{when(m.at)}</p>
            </div>
          </div>
        ))}
      </div>
      {newBelow && (
        <div className="relative h-0">
          <button type="button" onClick={toBottom} className="absolute left-1/2 -translate-x-1/2 -top-12 min-h-[40px] px-4 rounded-full bg-[#050F26] text-white text-xs font-semibold shadow-2xl whitespace-nowrap">New messages ↓</button>
        </div>
      )}

      {error && <p role="alert" className="px-4 py-2 text-sm text-red-600">{error}</p>}

      {thread.isRequest ? (
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface)]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{thread.name} wants to message you. They can send more only if you accept, and aren’t told if you delete it.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={suspended} onClick={() => act(() => api.respond(thread.id, true))} className={primary}>Accept</button>
            <button type="button" onClick={() => act(() => api.respond(thread.id, false), 'Request deleted', true)} className={outline}>Delete</button>
          </div>
        </div>
      ) : suspended ? null : waiting ? (
        <p className="p-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border-subtle)] bg-[var(--surface)]">Request sent. You can write more once it’s accepted.</p>
      ) : (
        <Composer limit={MESSAGE_LIMIT} label={`Message ${thread.name}`} placeholder="Write a message"
          onSend={async body => { const sent = await act(() => api.send(thread.id, body)); if (sent) await load(); return sent; }} />
      )}

      {suspended && <SuspendedNotice />}

      {dialog === 'block' && (
        <FocusPopup label={`Block ${thread.name}`} onClose={() => setDialog(null)}>
          <p className="font-serif-title text-lg font-bold text-[var(--text)]">Block {thread.name}?</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Neither of you will be able to send messages. They aren’t told. You can unblock them in message settings.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button type="button" onClick={() => setDialog(null)} className={outline}>Cancel</button>
            <button type="button" onClick={() => { setDialog(null); act(() => api.block(thread.otherId), `${thread.name} is blocked`, true); }} className="min-h-[46px] rounded-xl bg-red-600 text-white text-sm font-semibold">Block</button>
          </div>
        </FocusPopup>
      )}
      {dialog === 'report' && (
        <ReportDialog name={thread.name} onClose={() => setDialog(null)} onSubmit={async (reason, details, alsoBlock) => {
          await act(async () => {
            await api.report(thread.id, reason, details);
            if (alsoBlock) await api.block(thread.otherId);
          }, alsoBlock ? 'Report sent and person blocked' : 'Report sent', alsoBlock);
          setDialog(null);
        }} />
      )}
    </section>
  );
}

function NewMessage({ api, to, suspended, onBack, onStarted }: { api: ChatApi; to: string; suspended: boolean; onBack: () => void; onStarted: (id: string) => Promise<void> }) {
  const [person, setPerson] = useState<(Person & { mutual: boolean }) | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    api.person(to).then(p => { if (live) setPerson(p); }).catch(e => { if (live) { setError(chatErrorText(e)); setPerson(null); } });
    return () => { live = false; };
  }, [api, to]);

  if (person === undefined) return <p className="p-8 text-center text-sm text-[var(--text-muted)]">Loading…</p>;
  if (!person) return <div className="p-8 text-center"><Back onClick={onBack} /><p className="text-[var(--text-secondary)]">{error || 'This person could not be found.'}</p></div>;

  return (
    <section aria-label={`New message to ${person.name}`} className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <Back onClick={onBack} />
        <Avatar name={person.name} size="w-10 h-10" />
        <h2 className="font-semibold text-[var(--text)] truncate">{person.name}</h2>
      </header>
      <div className="flex-1 p-5 text-center text-sm text-[var(--text-secondary)]">
        {person.mutual ? 'You follow each other, so your message goes straight to their chats.' : 'This is a message request. You can send one short message, without links. You can write more if they accept.'}
        {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
      </div>
      {suspended ? <SuspendedNotice /> : <Composer limit={person.mutual ? MESSAGE_LIMIT : REQUEST_LIMIT} label={`Message ${person.name}`} placeholder="Write your message"
        onSend={async body => {
          setError('');
          try { await onStarted(await api.start(to, body)); return true; }
          catch (e) { setError(chatErrorText(e)); return false; }
        }} />}
    </section>
  );
}

function SettingsPanel({ api, onBack, onChanged }: { api: ChatApi; onBack: () => void; onChanged: () => Promise<void> }) {
  const [allow, setAllow] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState<Person[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.allowsRequests(), api.blocked()]);
      setAllow(a); setBlocked(b);
    } catch (e) { setError(chatErrorText(e)); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  return (
    <section aria-label="Message settings" className="h-full overflow-y-auto p-4">
      <div className="flex items-center gap-2"><Back onClick={onBack} /><h2 className="text-lg font-bold text-[var(--text)]">Message settings</h2></div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <label className={`${card} mt-3 flex items-start gap-3 p-4`}>
        <input type="checkbox" className="mt-1" disabled={allow === null} checked={allow ?? true}
          onChange={async e => { const next = e.target.checked; setAllow(next); try { await api.setAllowsRequests(next); } catch (err) { setAllow(!next); setError(chatErrorText(err)); } }} />
        <span><span className="block text-sm font-semibold text-[var(--text)]">Allow message requests</span><span className="block text-xs text-[var(--text-muted)]">When off, only people you follow who also follow you can start a chat.</span></span>
      </label>
      <h3 className="mt-5 mb-2 text-sm font-bold text-[var(--text)]">Blocked people</h3>
      {blocked.length === 0 && <p className="text-sm text-[var(--text-muted)]">You haven’t blocked anyone.</p>}
      <ul className="space-y-2">
        {blocked.map(p => (
          <li key={p.id} className={`${card} flex items-center gap-3 p-3`}>
            <Avatar name={p.name} size="w-9 h-9" />
            <span className="flex-1 min-w-0 truncate text-sm text-[var(--text)]">{p.name}</span>
            <button type="button" onClick={async () => { try { await api.unblock(p.id); await load(); await onChanged(); } catch (e) { setError(chatErrorText(e)); } }} className={outline}>Unblock</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TurnOn({ onEnable }: { onEnable: () => Promise<void> }) {
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="content-wrapper py-5 max-w-md mx-auto">
      <div className={`${card} p-5`}>
        <h1 className="text-2xl font-display font-bold text-[var(--text)]">Turn on messages</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Chat with authors and readers. People can find you only after you turn this on.</p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)] list-disc pl-5">
          <li>People you follow who follow you back can chat with you straight away.</li>
          <li>Anyone else sends one short request, which you can accept or delete.</li>
          <li>You can block or report anyone. Never share passwords, bank details or codes.</li>
          <li>Messages are not end-to-end encrypted. Our team can see a reported chat’s recent messages, and may access stored messages when safety or the law requires it.</li>
        </ul>
        <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-[var(--text)]">
          <input type="checkbox" className="mt-1" checked={adult} onChange={e => setAdult(e.target.checked)} />I am 18 years old or older.
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm font-semibold text-[var(--text)]">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>I agree to the <Link href="/community-rules" target="_blank" className="text-[var(--primary)] underline">Community Rules</Link> and <Link href="/terms" target="_blank" className="text-[var(--primary)] underline">Terms</Link>, and have read the <Link href="/privacy" target="_blank" className="text-[var(--primary)] underline">Privacy Policy</Link>.</span>
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={!adult || !agreed || busy} onClick={async () => { setBusy(true); setError(''); try { await onEnable(); } catch (e) { setError(chatErrorText(e)); } setBusy(false); }} className={`${primary} w-full mt-4`}>Turn on messages</button>
      </div>
    </div>
  );
}

export function ChatScreen({ api, view, onView }: { api: ChatApi; view: ChatView; onView: (v: ChatView) => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'needs-setup' | 'unavailable' | 'error'>('loading');
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [tab, setTab] = useState<'chats' | 'requests'>('chats');
  const [note, setNote] = useState('');
  const [suspended, setSuspended] = useState(false);

  const latest = useRef(0);
  // the suspension is checked with the inbox, so being suspended or restored shows without a reload
  const refresh = useCallback(async () => {
    const mine = ++latest.current;
    const [list, held] = await Promise.all([api.inbox(), api.suspended()]);
    // an older answer arriving late must not undo a newer one
    if (mine !== latest.current) return;
    setThreads(list); setSuspended(held);
  }, [api]);

  // tells the unread badge to count again after something done on this screen
  const changedHere = useCallback(async () => {
    window.dispatchEvent(new Event(CHAT_CHANGED));
    await refresh();
  }, [refresh]);

  const boot = useCallback(async () => {
    setState('loading');
    try {
      const s = await api.state();
      if (s === 'ready') await refresh();
      setState(s);
    } catch { setState('error'); }
  }, [api, refresh]);

  useEffect(() => { boot(); }, [boot]);

  // Live updates, with a slower check behind them in case the connection drops
  useEffect(() => {
    if (state !== 'ready') return;
    return watchChat(api, () => { refresh().catch(() => {}); });
  }, [api, state, refresh]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(''), 3500);
    return () => clearTimeout(timer);
  }, [note]);

  // An open chat covers the phone screen, so the page behind must not scroll
  const open = view.kind !== 'inbox';
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 767px)').matches) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, [open]);

  const message = (title: string, text: string, retry = false) => (
    <div className="content-wrapper py-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-display font-bold text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{text}</p>
      {retry && <button type="button" onClick={boot} className={`${primary} mt-4`}>Try again</button>}
    </div>
  );

  if (state === 'loading') return message('Messages', 'Loading…');
  if (state === 'unavailable') return message('Messages are coming soon', 'Chat isn’t switched on yet.');
  if (state === 'error') return message('Messages didn’t load', 'Check your connection and try again.', true);
  if (state === 'needs-setup') return <TurnOn onEnable={async () => { await api.enable(); await boot(); }} />;

  const chats = (threads || []).filter(t => !t.isRequest);
  const requests = (threads || []).filter(t => t.isRequest);
  const shown = tab === 'chats' ? chats : requests;
  const current = view.kind === 'thread' ? (threads || []).find(t => t.id === view.id) : undefined;
  const back = () => onView({ kind: 'inbox' });

  return (
    <div className="content-wrapper py-3 max-w-5xl mx-auto">
      <div className="md:grid md:grid-cols-[320px_minmax(0,1fr)] md:gap-4 md:h-[calc(100vh-215px)] md:min-h-[460px]">
        {/* Inbox */}
        <section aria-label="Inbox" className="flex flex-col min-h-0">
          <MessagesSwitch active="chats" />
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold text-[var(--text)]">Messages</h1>
            <button type="button" onClick={() => onView({ kind: 'settings' })} className="min-h-[44px] px-3 text-sm font-semibold text-[var(--primary)]">Settings</button>
          </div>
          {suspended && <p role="status" className="mb-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-[var(--text)]">Your chat is suspended. You can read, block and report, but not send. <Link href="/contact" className="font-semibold text-[var(--primary)]">Contact us</Link></p>}
          <div role="tablist" className="grid grid-cols-2 mb-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
            {(['chats', 'requests'] as const).map(id => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-[44px] text-sm font-semibold border-b-[3px] capitalize ${tab === id ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
                {id}{id === 'requests' && requests.length > 0 && <span className="ml-1.5 inline-block min-w-[20px] px-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs">{requests.length}</span>}
              </button>
            ))}
          </div>
          <ul className="space-y-2 md:overflow-y-auto md:min-h-0 md:pr-1">
            {shown.map(t => (
              <li key={t.id}>
                <button type="button" onClick={() => onView({ kind: 'thread', id: t.id })} aria-current={current?.id === t.id || undefined}
                  className={`${card} w-full flex items-center gap-3 p-3 text-left ${current?.id === t.id ? '!border-[var(--primary)]' : ''}`}>
                  <Avatar name={t.name} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold text-[var(--text)]">{t.name}</span>
                      <span className="flex-shrink-0 text-[11px] text-[var(--text-muted)]">{when(t.lastAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`flex-1 truncate text-sm ${t.unread ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{t.lastMine ? 'You: ' : ''}{t.lastBody}</span>
                      {t.unread > 0 && <span aria-label={`${t.unread} unread`} className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--primary)] text-[var(--bg)] text-xs font-bold flex items-center justify-center">{t.unread > 99 ? '99+' : t.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              {tab === 'chats' ? <>No chats yet. <Link href="/creators/discover" className="font-semibold text-[var(--primary)]">Find authors</Link></> : 'No message requests.'}
            </div>
          )}
        </section>

        {/* Open chat: full screen on phones, beside the inbox on desktop */}
        <div className={open
          ? 'fixed inset-0 z-[75] bg-[var(--bg)] md:static md:z-auto md:min-h-0 md:rounded-2xl md:overflow-hidden md:border md:border-[var(--border-subtle)]'
          : 'hidden md:flex md:items-center md:justify-center md:rounded-2xl md:border md:border-dashed md:border-[var(--border)]'}>
          {view.kind === 'inbox' && <p className="text-sm text-[var(--text-muted)]">Choose a chat to read it here.</p>}
          {view.kind === 'thread' && (current
            ? <Conversation key={current.id} api={api} suspended={suspended} thread={current} onBack={back} say={setNote} onChanged={async closed => { await changedHere(); if (closed) back(); }} />
            : <div className="p-8 text-center"><Back onClick={back} /><p className="text-sm text-[var(--text-secondary)]">{threads ? 'This chat is no longer available.' : 'Loading…'}</p></div>)}
          {view.kind === 'new' && (() => {
            const existing = (threads || []).find(t => t.otherId === view.to);
            return existing
              ? <Conversation key={existing.id} api={api} suspended={suspended} thread={existing} onBack={back} say={setNote} onChanged={async closed => { await changedHere(); if (closed) back(); }} />
              : <NewMessage api={api} suspended={suspended} to={view.to} onBack={back} onStarted={async id => { await changedHere(); onView({ kind: 'thread', id }); }} />;
          })()}
          {view.kind === 'settings' && <SettingsPanel api={api} onBack={back} onChanged={changedHere} />}
        </div>
      </div>
      {note && <p role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[90] px-4 py-2.5 rounded-full bg-[#050F26] text-white text-sm shadow-2xl">{note}</p>}
    </div>
  );
}
