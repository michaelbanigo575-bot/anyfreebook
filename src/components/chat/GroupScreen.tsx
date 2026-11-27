'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { FocusPopup } from '@/components/ShareSheet';
import { MESSAGE_LIMIT, REPORT_REASONS, chatErrorText, type ReportReason } from '@/lib/chat/types';
import {
  GROUP_ABOUT_LIMIT, GROUP_NAME_LIMIT, GROUP_SIZE, MAX_LOADED, MESSAGE_PAGE, REACTIONS, TIMEOUT_OPTIONS,
  type Applicant, type GroupApi, type GroupMember, type GroupMessage, type GroupSummary, type InvitePreview, type PublicGroup, type Visibility,
} from '@/lib/chat/groups';
import { CHAT_CHANGED, watchChat } from '@/lib/chat/watch';
import { StudyRoom } from './StudyRoom';
import { GroupBanner, GroupSettingsForm, HelperPicker, StudySessions, fullDate, useGroupExtras } from './GroupAdmin';
import { Avatar, Back, Composer, MessagesSwitch, SuspendedNotice, card, outline, primary, when } from './ChatScreen';

export type GroupView =
  | { kind: 'list' } | { kind: 'discover' } | { kind: 'create' }
  | { kind: 'group'; id: string } | { kind: 'study'; id: string } | { kind: 'info'; id: string } | { kind: 'invite'; token: string };

const field = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-[16px] text-[var(--text)]';
const danger = 'min-h-[46px] px-4 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50';
const small = 'min-h-[40px] px-3 rounded-lg text-sm font-semibold';

const people = (n: number) => `${n} ${n === 1 ? 'member' : 'members'}`;
const historyText = (on: boolean) => (on ? 'New members can read earlier messages.' : 'New members see only messages sent after they join.');

function Confirm({ title, text, action, onCancel, onConfirm }: { title: string; text: string; action: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <FocusPopup label={title} onClose={onCancel}>
      <p className="font-serif-title text-lg font-bold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{text}</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button type="button" onClick={onCancel} className={outline}>Cancel</button>
        <button type="button" onClick={onConfirm} className={danger}>{action}</button>
      </div>
    </FocusPopup>
  );
}

function PanelHeader({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
      <Back onClick={onBack} />
      <h2 className="flex-1 min-w-0 truncate font-semibold text-[var(--text)]">{title}</h2>
      {children}
    </header>
  );
}

// ---------------------------------------------------------------- the open group

function MessageMenu({ message, canDelete, suspended, canReply, pinned, onPin, onClose, onReact, onReply, onDelete, onReport }: {
  message: GroupMessage; canDelete: boolean; suspended: boolean; canReply: boolean; pinned: boolean; onPin: (() => void) | null; onClose: () => void;
  onReact: (emoji: string | null) => void; onReply: () => void; onDelete: () => void; onReport: () => void;
}) {
  const mine = message.reactions.find(r => r.mine)?.emoji;
  const row = 'w-full min-h-[46px] px-3 text-left text-sm font-semibold rounded-xl hover:bg-[var(--surface-hover)]';
  return (
    <FocusPopup label="Message options" onClose={onClose}>
      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 break-words"><span className="font-semibold text-[var(--text)]">{message.mine ? 'You' : message.sender}:</span> {message.body}</p>
      {!suspended && (
        <div role="group" aria-label="React" className="grid grid-cols-4 gap-1 mt-3">
          {REACTIONS.map(e => (
            <button key={e} type="button" aria-pressed={mine === e} aria-label={mine === e ? `Remove ${e}` : `React ${e}`}
              onClick={() => onReact(mine === e ? null : e)}
              className={`min-h-[48px] rounded-xl text-2xl ${mine === e ? 'bg-[var(--primary-light)] ring-2 ring-[var(--primary)]' : 'hover:bg-[var(--surface-hover)]'}`}>{e}</button>
          ))}
        </div>
      )}
      <div className="mt-2">
        {!suspended && canReply && <button type="button" onClick={onReply} className={`${row} text-[var(--text)]`}>Reply</button>}
        {onPin && <button type="button" onClick={onPin} className={`${row} text-[var(--text)]`}>{pinned ? 'Unpin' : 'Pin for everyone'}</button>}
        {!message.mine && <button type="button" onClick={onReport} className={`${row} text-[var(--text)]`}>Report</button>}
        {canDelete && <button type="button" onClick={onDelete} className={`${row} text-red-600`}>Delete message</button>}
      </div>
    </FocusPopup>
  );
}

function GroupReport({ message, onClose, onSubmit }: { message: GroupMessage; onClose: () => void; onSubmit: (r: ReportReason, details: string, alsoBlock: boolean) => Promise<void> }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <FocusPopup label={`Report ${message.sender}`} onClose={onClose}>
      <div className="max-h-[75vh] overflow-y-auto">
        <p className="font-serif-title text-lg font-bold text-[var(--text)]">Report this message</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Our team receives this message and up to 19 before it. {message.sender} isn’t told who reported it.</p>
        <fieldset className="mt-3">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map(r => (
            <label key={r.id} className="flex items-center gap-3 min-h-[40px] text-sm text-[var(--text)]">
              <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />{r.label}
            </label>
          ))}
        </fieldset>
        <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={2} aria-label="More details" placeholder="More details (optional)" className={`${field} mt-2`} />
        <label className="flex items-center gap-3 min-h-[40px] text-sm text-[var(--text)]"><input type="checkbox" checked={alsoBlock} onChange={e => setAlsoBlock(e.target.checked)} />Also block {message.sender}</label>
        <button type="button" disabled={!reason || busy} onClick={async () => { setBusy(true); await onSubmit(reason!, details, alsoBlock); setBusy(false); }} className={`${primary} w-full mt-2`}>{busy ? 'Sending…' : 'Send report'}</button>
      </div>
    </FocusPopup>
  );
}

function GroupThread({ api, group, tick, suspended, studying, onTab, onBack, onInfo, onChanged, say }: {
  api: GroupApi; group: GroupSummary; tick: number; suspended: boolean; studying: boolean; onTab: (study: boolean) => void;
  onBack: () => void; onInfo: () => void; onChanged: () => Promise<void>; say: (t: string) => void;
}) {
  const [log, setLog] = useState<GroupMessage[] | null>(null);
  const [more, setMore] = useState(false);
  const [limit, setLimit] = useState(MESSAGE_PAGE);
  const [picked, setPicked] = useState<GroupMessage | null>(null);
  const [reporting, setReporting] = useState<GroupMessage | null>(null);
  const [deleting, setDeleting] = useState<GroupMessage | null>(null);
  const [replying, setReplying] = useState<GroupMessage | null>(null);
  const [error, setError] = useState('');
  const [newBelow, setNewBelow] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const newestSeen = useRef(0);
  const latest = useRef(0);
  // how far from the bottom the reader was before earlier messages were added above
  const keepPlace = useRef<number | null>(null);
  const extras = useGroupExtras(api, group.id, tick);
  const { controls, roles, pins } = extras;
  const announce = !suspended && controls.can.includes('announce');
  const pausedUntil = controls.timedOutUntil && new Date(controls.timedOutUntil).getTime() > Date.now() ? controls.timedOutUntil : null;
  const blockedFromPosting = pausedUntil ? `The group has paused your posting until ${fullDate(pausedUntil)}. You can still read and report.`
    : controls.adminsOnly && !controls.can.includes('announce') ? 'Only the group admin and helpers can post right now. You can still react.' : '';
  const isStaff = (id: string) => (roles.get(id)?.permissions.length || 0) > 0;

  const load = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const next = await api.messages(group.id, limit);
      if (mine !== latest.current) return;
      setLog(next.messages); setMore(next.more);
    } catch (e) {
      // a failed refresh keeps the messages already on screen
      if (mine === latest.current) { setError(chatErrorText(e, 'group')); setLog(current => current ?? []); }
    }
  }, [api, group.id, limit]);

  // `tick` rises whenever something may have changed, including reactions
  useEffect(() => { load(); }, [load, tick]);

  const toBottom = () => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
    atBottom.current = true;
    setNewBelow(false);
  };

  useEffect(() => {
    const box = scroller.current;
    if (!log || !box) return;
    if (keepPlace.current !== null) {
      box.scrollTop = box.scrollHeight - keepPlace.current;
      keepPlace.current = null;
    }
    const newest = log[log.length - 1];
    if (!newest || newest.id <= newestSeen.current) return;
    const first = newestSeen.current === 0;
    newestSeen.current = newest.id;
    if (first || atBottom.current || newest.mine) toBottom();
    else setNewBelow(true);
  }, [log]);

  // counts as read only while the page is actually in view
  useEffect(() => {
    if (studying || group.unread < 1) return;
    let done = false;
    const mark = () => {
      if (done || document.visibilityState !== 'visible') return;
      done = true;
      api.markRead(group.id).then(() => onChanged()).catch(() => { done = false; });
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [group.id, group.unread, studying]); // eslint-disable-line react-hooks/exhaustive-deps

  // returning to the chat starts again at the newest message
  useEffect(() => { if (!studying) toBottom(); }, [studying]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (work: () => Promise<unknown>, done?: string) => {
    setError('');
    try { await work(); if (done) say(done); await Promise.all([load(), extras.reload()]); await onChanged(); return true; }
    // a refusal often means the rules changed, so look again
    catch (e) { setError(chatErrorText(e, 'group')); await extras.reload(); await onChanged().catch(() => {}); return false; }
  };

  const byId = new Map((log || []).map(m => [m.id, m]));

  return (
    <section aria-label={`Group ${group.name}`} className="flex flex-col h-full min-h-0">
      <PanelHeader title={group.name} onBack={onBack}>
        <button type="button" onClick={onInfo} aria-label={`Group details, ${people(group.members)}${group.waiting ? `, ${group.waiting} waiting to join` : ''}`} className={`${small} flex items-center gap-1.5 text-[var(--primary)]`}>
          Details{group.waiting > 0 && <span aria-hidden className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">{group.waiting}</span>}
        </button>
      </PanelHeader>
      <div role="tablist" aria-label="Chat or study" className="grid grid-cols-2 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        {([[false, 'Chat'], [true, 'Study Room']] as const).map(([value, label]) => (
          <button key={label} type="button" role="tab" aria-selected={studying === value} onClick={() => onTab(value)} className={`min-h-[42px] text-sm font-semibold border-b-[3px] ${studying === value ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
            {label}{!value && studying && group.unread > 0 && <span className="ml-1.5 inline-block min-w-[20px] px-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs">{group.unread}</span>}
          </button>
        ))}
      </div>
      {studying && <StudyRoom api={api.study} groupId={group.id} canPost={!suspended && !pausedUntil} canLead={!suspended && controls.can.includes('announce')} say={say} />}
      {/* the chat stays loaded behind the Study Room, so nothing is lost when switching */}
      <div className={studying ? 'hidden' : 'contents'}>
      <GroupBanner pins={pins} sessions={extras.sessions} canUnpin={announce} onUnpin={id => act(() => api.pin(group.id, id, false), 'Unpinned')} />

      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2" aria-live="polite"
        onScroll={e => {
          const box = e.currentTarget;
          atBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
          if (atBottom.current) setNewBelow(false);
        }}>
        {log === null && <p className="text-center text-sm text-[var(--text-muted)] py-8">Loading messages…</p>}
        {log?.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-8">No messages yet. Say hello.</p>}
        {more && limit < MAX_LOADED && (
          <button type="button" className={`${outline} block mx-auto`}
            onClick={() => { const box = scroller.current; keepPlace.current = box ? box.scrollHeight - box.scrollTop : null; setLimit(l => l + MESSAGE_PAGE); }}>
            Load earlier messages
          </button>
        )}
        {log?.map((m, i) => {
          const quoted = m.replyTo !== null ? byId.get(m.replyTo) : undefined;
          const showName = !m.mine && log[i - 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
              {showName && <span className="px-1 mb-0.5 text-xs font-semibold text-[var(--primary)]">{m.sender}</span>}
              <div className={`flex items-end gap-1 max-w-[90%] ${m.mine ? 'flex-row-reverse' : ''}`}>
                <div className={`min-w-0 rounded-2xl px-4 py-2.5 ${m.mine ? 'rounded-br-md bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white' : 'rounded-bl-md bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text)]'}`}>
                  <span className="sr-only">{m.mine ? 'You said: ' : `${m.sender} said: `}</span>
                  {m.replyTo !== null && (
                    <p className={`mb-1.5 border-l-[3px] pl-2 text-xs line-clamp-2 break-words ${m.mine ? 'border-white/70 text-white/85' : 'border-[var(--primary)] text-[var(--text-muted)]'}`}>
                      {quoted ? <><span className="font-semibold">{quoted.mine ? 'You' : quoted.sender}: </span>{quoted.body}</> : 'An earlier or removed message'}
                    </p>
                  )}
                  {/* plain text only: links are never turned into something you can tap by accident */}
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[10px] text-right ${m.mine ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>{when(m.at)}</p>
                </div>
                <button type="button" onClick={() => setPicked(m)} aria-label={`Options for message from ${m.mine ? 'you' : m.sender}`} className="flex-shrink-0 w-9 h-9 rounded-full text-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">⋯</button>
              </div>
              {m.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.reactions.map(r => (
                    <button key={r.emoji} type="button" disabled={(suspended || !!pausedUntil) && !r.mine} aria-pressed={r.mine}
                      aria-label={`${r.emoji} ${r.total}${r.mine ? ', including yours' : ''}`}
                      onClick={() => act(() => api.react(group.id, m.id, r.mine ? null : r.emoji))}
                      className={`min-h-[32px] px-2.5 rounded-full text-sm border ${r.mine ? 'bg-[var(--primary-light)] border-[var(--primary)] text-[var(--text)] font-semibold' : 'bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
                      {r.emoji} {r.total}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {newBelow && (
        <div className="relative h-0">
          <button type="button" onClick={toBottom} className="absolute left-1/2 -translate-x-1/2 -top-12 min-h-[40px] px-4 rounded-full bg-[#050F26] text-white text-xs font-semibold shadow-2xl whitespace-nowrap">New messages ↓</button>
        </div>
      )}

      {error && <p role="alert" className="px-4 py-2 text-sm text-red-600">{error}</p>}

      {suspended ? <SuspendedNotice /> : blockedFromPosting ? (
        <p role="note" className="p-4 text-center text-sm text-[var(--text-secondary)] border-t border-[var(--border-subtle)] bg-[var(--surface)]">{blockedFromPosting}</p>
      ) : (
        <>
          {controls.slowSeconds > 0 && !controls.can.length && <p className="px-4 pt-1.5 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] bg-[var(--surface)]">Slow mode is on: take your time between messages.</p>}
          {replying && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface)]">
              <p className="flex-1 min-w-0 truncate text-xs text-[var(--text-muted)]">Replying to <span className="font-semibold text-[var(--text)]">{replying.mine ? 'yourself' : replying.sender}</span>: {replying.body}</p>
              <button type="button" onClick={() => setReplying(null)} aria-label="Cancel reply" className="w-9 h-9 text-lg text-[var(--text-muted)]">✕</button>
            </div>
          )}
          <Composer limit={MESSAGE_LIMIT} label={`Message ${group.name}`} placeholder="Write to the group"
            onSend={async body => { const sent = await act(() => api.send(group.id, body, replying?.id ?? null)); if (sent) setReplying(null); return sent; }} />
        </>
      )}
      </div>

      {picked && (
        <MessageMenu message={picked} suspended={suspended || !!pausedUntil} canReply={!blockedFromPosting} onClose={() => setPicked(null)}
          canDelete={picked.mine || group.isAdmin || (controls.can.includes('moderate') && !isStaff(picked.senderId))}
          pinned={pins.some(p => p.id === picked.id)}
          onPin={announce ? () => { const id = picked.id; const on = !pins.some(p => p.id === id); setPicked(null); act(() => api.pin(group.id, id, on), on ? 'Pinned' : 'Unpinned'); } : null}
          onReact={emoji => { setPicked(null); act(() => api.react(group.id, picked.id, emoji)); }}
          onReply={() => { setReplying(picked); setPicked(null); }}
          onDelete={() => { setDeleting(picked); setPicked(null); }}
          onReport={() => { setReporting(picked); setPicked(null); }} />
      )}
      {deleting && (
        <Confirm title="Delete this message?" text="It disappears for everyone in the group. A copy is kept in case it is needed for a safety report." action="Delete"
          onCancel={() => setDeleting(null)} onConfirm={() => { const m = deleting; setDeleting(null); if (replying?.id === m.id) setReplying(null); act(() => api.deleteMessage(group.id, m.id), 'Message deleted'); }} />
      )}
      {reporting && (
        <GroupReport message={reporting} onClose={() => setReporting(null)} onSubmit={async (reason, details, alsoBlock) => {
          await act(async () => {
            await api.report(group.id, reporting.id, reason, details);
            if (alsoBlock) await api.block(reporting.senderId);
          }, alsoBlock ? 'Report sent and person blocked' : 'Report sent');
          setReporting(null);
        }} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- details and management

type Ask = { title: string; text: string; action: string; run: () => void };

function GroupInfo({ api, group, tick, suspended, onBack, onChanged, onLeft, say }: {
  api: GroupApi; group: GroupSummary; tick: number; suspended: boolean;
  onBack: () => void; onChanged: () => Promise<void>; onLeft: () => void; say: (t: string) => void;
}) {
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [token, setToken] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [about, setAbout] = useState(group.description);
  const [open, setOpen] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [error, setError] = useState('');
  const latest = useRef(0);
  const extras = useGroupExtras(api, group.id, tick);
  const { controls, roles } = extras;
  const canApprove = group.isAdmin || controls.can.includes('approve');
  const canModerate = group.isAdmin || controls.can.includes('moderate');

  const load = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const [list, waiting] = await Promise.all([api.members(group.id), canApprove ? api.applicants(group.id) : Promise.resolve([])]);
      if (mine === latest.current) { setMembers(list); setApplicants(waiting); }
    } catch (e) { if (mine === latest.current) setError(chatErrorText(e, 'group')); }
  }, [api, group.id, canApprove]);
  useEffect(() => { load(); }, [load, tick]);

  const act = async (work: () => Promise<unknown>, done?: string) => {
    setError('');
    try { await work(); if (done) say(done); await onChanged(); await Promise.all([load(), extras.reload()]); return true; }
    catch (e) { setError(chatErrorText(e, 'group')); return false; }
  };
  const leaving = async (work: () => Promise<unknown>, done: string) => {
    setError('');
    try { await work(); say(done); onLeft(); await onChanged(); }
    catch (e) { setError(chatErrorText(e, 'group')); }
  };

  const link = token && typeof window !== 'undefined' ? `${window.location.origin}/messages/groups?invite=${token}` : '';
  const asking = applicants.filter(a => !a.banned);
  const banned = applicants.filter(a => a.banned);
  const heading = 'mt-5 mb-2 text-sm font-bold text-[var(--text)]';
  const row = `${card} flex flex-wrap items-center gap-2 p-3`;

  return (
    <section aria-label={`Details of ${group.name}`} className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <button type="button" onClick={onBack} className={`${small} text-[var(--primary)]`}>← Back to chat</button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        {editing ? (
          <form className={`${card} p-4 space-y-2`} onSubmit={async e => { e.preventDefault(); if (await act(() => api.update(group.id, name, about), 'Group updated')) setEditing(false); }}>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={GROUP_NAME_LIMIT} aria-label="Group name" className={field} />
            <textarea value={about} onChange={e => setAbout(e.target.value)} maxLength={GROUP_ABOUT_LIMIT} rows={3} aria-label="About the group" className={field} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEditing(false)} className={outline}>Cancel</button>
              <button type="submit" className={primary}>Save</button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="text-xl font-display font-bold text-[var(--text)] break-words">{group.name}</h2>
            {group.description && <p className="mt-1 text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words">{group.description}</p>}
            <p className="mt-2 text-xs text-[var(--text-muted)]">{group.visibility === 'public' ? 'Public group' : 'Private group'} · {people(group.members)} of {GROUP_SIZE}. {historyText(group.historyForNew)}</p>
            {group.isAdmin && !suspended && <button type="button" onClick={() => { setName(group.name); setAbout(group.description); setEditing(true); }} className={`${outline} mt-3`}>Edit name and description</button>}
          </>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

        <label className={`${card} mt-4 flex items-center gap-3 p-4`}>
          <input type="checkbox" checked={group.muted} onChange={e => { const next = e.target.checked; act(() => api.mute(group.id, next), next ? 'Group muted' : 'Group unmuted'); }} />
          <span className="text-sm font-semibold text-[var(--text)]">Mute this group</span>
        </label>

        {controls.rules && (
          <>
            <h3 className={heading}>Group rules</h3>
            <p className={`${card} p-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words`}>{controls.rules}</p>
          </>
        )}

        <StudySessions api={api} groupId={group.id} sessions={extras.sessions} canPlan={!suspended && controls.can.includes('announce')} onChanged={extras.reload} say={say} />

        {group.isAdmin && !suspended && <GroupSettingsForm api={api} groupId={group.id} controls={controls} onChanged={extras.reload} say={say} />}

        {group.isAdmin && group.visibility === 'private' && !suspended && (
          <>
            <h3 className={heading}>Invite link</h3>
            <p className="text-xs text-[var(--text-muted)] mb-2">People who open this link can ask to join. You approve each one.</p>
            {link ? (
              <>
                <input readOnly value={link} aria-label="Invite link" onFocus={e => e.target.select()} className={field} />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" className={primary} onClick={async () => { try { await navigator.clipboard.writeText(link); say('Link copied'); } catch { setError('Select the link and copy it.'); } }}>Copy link</button>
                  <button type="button" className={outline} onClick={() => setAsk({ title: 'Reset the invite link?', text: 'The old link will stop working. People already waiting stay on the list.', action: 'Reset', run: () => { act(async () => setToken(await api.inviteToken(group.id, true)), 'New link made'); } })}>Reset link</button>
                </div>
              </>
            ) : <button type="button" className={outline} onClick={() => act(async () => setToken(await api.inviteToken(group.id, false)))}>Show invite link</button>}
          </>
        )}

        {canApprove && asking.length > 0 && (
          <>
            <h3 className={heading}>Waiting to join ({asking.length})</h3>
            <ul className="space-y-2">
              {asking.map(a => (
                <li key={a.id} className={row}>
                  <Avatar name={a.name} size="w-9 h-9" />
                  <span className="flex-1 min-w-0 truncate text-sm text-[var(--text)]">{a.name}</span>
                  <button type="button" disabled={suspended} onClick={() => act(() => api.decide(group.id, a.id, true), `${a.name} joined`)} className={primary}>Approve</button>
                  <button type="button" onClick={() => act(() => api.decide(group.id, a.id, false), 'Request declined')} className={outline}>Decline</button>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className={heading}>Members</h3>
        {members === null && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        <ul className="space-y-2">
          {members?.map(m => {
            const role = roles.get(m.id);
            const helper = !!role?.permissions.length;
            const paused = role?.timedOutUntil;
            // helpers manage ordinary members only; nobody manages the admin from here
            const manageable = !m.isAdmin && m.id !== 'me' && (group.isAdmin || (canModerate && !helper));
            return (
            <li key={m.id} className={row}>
              <Avatar name={m.name} size="w-9 h-9" />
              <span className="flex-1 min-w-0 truncate text-sm text-[var(--text)]">{m.name}</span>
              {m.isAdmin && <span className="text-xs font-semibold text-[var(--primary)]">Admin</span>}
              {!m.isAdmin && helper && <span className="text-xs font-semibold text-[var(--primary)]">Helper</span>}
              {paused && <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Paused</span>}
              {manageable && (
                <button type="button" aria-expanded={open === m.id} aria-label={`Manage ${m.name}`} onClick={() => setOpen(open === m.id ? null : m.id)} className={`${small} text-[var(--primary)]`}>Manage</button>
              )}
              {open === m.id && manageable && (
                <div className="basis-full space-y-2">
                  {group.isAdmin && !suspended && <HelperPicker key={(role?.permissions || []).join()} current={role?.permissions || []} onSave={p => act(() => api.setHelper(group.id, m.id, p), p.length ? `${m.name} is a helper` : `${m.name} is no longer a helper`)} />}
                  <div>
                    <p className="mb-1 text-xs font-bold text-[var(--text)]">{paused ? `Posting paused until ${fullDate(paused)}` : 'Pause their posting'}</p>
                    {paused ? <button type="button" onClick={() => act(() => api.timeout(group.id, m.id, 0), `${m.name} can post again`)} className={`${outline} w-full`}>End time-out</button> : (
                      <div className="grid grid-cols-3 gap-2">
                        {TIMEOUT_OPTIONS.map(o => <button key={o.minutes} type="button" onClick={() => act(() => api.timeout(group.id, m.id, o.minutes), `${m.name} is paused for ${o.label}`)} className={outline}>{o.label}</button>)}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                  {group.isAdmin && <button type="button" className={outline} onClick={() => setAsk({ title: `Make ${m.name} the admin?`, text: 'You will become an ordinary member. Only the new admin can give it back.', action: 'Make admin', run: () => { act(() => api.transfer(group.id, m.id), `${m.name} is now the admin`); } })}>Make admin</button>}
                  <button type="button" className={outline} onClick={() => setAsk({ title: `Remove ${m.name}?`, text: group.visibility === 'public' ? 'They can join again. Choose Ban to keep them out.' : 'They can ask to join again. Choose Ban to keep them out.', action: 'Remove', run: () => { act(() => api.remove(group.id, m.id, false), `${m.name} was removed`); } })}>Remove</button>
                  {group.isAdmin && <button type="button" className={`${outline} !text-red-600`} onClick={() => setAsk({ title: `Ban ${m.name}?`, text: 'They are removed and cannot come back unless you unban them.', action: 'Ban', run: () => { act(() => api.remove(group.id, m.id, true), `${m.name} was banned`); } })}>Ban</button>}
                  </div>
                </div>
              )}
            </li>
            );
          })}
        </ul>

        {group.isAdmin && banned.length > 0 && (
          <>
            <h3 className={heading}>Banned</h3>
            <ul className="space-y-2">
              {banned.map(a => (
                <li key={a.id} className={row}>
                  <span className="flex-1 min-w-0 truncate text-sm text-[var(--text)]">{a.name}</span>
                  <button type="button" onClick={() => act(() => api.unban(group.id, a.id), `${a.name} was unbanned`)} className={outline}>Unban</button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-6 space-y-2">
          <button type="button" className={`${outline} w-full !text-red-600`} onClick={() => setAsk({
            title: `Leave ${group.name}?`,
            text: group.isAdmin ? (group.members > 1 ? 'The longest-standing member becomes the admin.' : 'You are the only member, so the group will be removed.') : 'You will stop receiving its messages.',
            action: 'Leave', run: () => { leaving(() => api.leave(group.id), 'You left the group'); },
          })}>Leave group</button>
          {group.isAdmin && (
            <button type="button" className={`${danger} w-full`} onClick={() => setAsk({ title: `Close ${group.name}?`, text: 'Nobody will be able to read or write in it again. This cannot be undone.', action: 'Close group', run: () => { leaving(() => api.close(group.id), 'Group closed'); } })}>Close group for everyone</button>
          )}
        </div>
      </div>
      {ask && <Confirm title={ask.title} text={ask.text} action={ask.action} onCancel={() => setAsk(null)} onConfirm={() => { const a = ask; setAsk(null); setOpen(null); a.run(); }} />}
    </section>
  );
}

// ---------------------------------------------------------------- creating and joining

function CreateGroup({ api, suspended, onBack, onCreated }: { api: GroupApi; suspended: boolean; onBack: () => void; onCreated: (id: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [history, setHistory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choices: { id: Visibility; title: string; text: string }[] = [
    { id: 'private', title: 'Private', text: 'Not listed. People with your link ask to join, and you approve them.' },
    { id: 'public', title: 'Public', text: 'Listed in Discover. Anyone with messages on can join straight away.' },
  ];
  return (
    <section aria-label="New group" className="flex flex-col h-full min-h-0">
      <PanelHeader title="New group" onBack={onBack} />
      {suspended ? <SuspendedNotice /> : (
        <form className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          onSubmit={async e => {
            e.preventDefault(); setBusy(true); setError('');
            try { await onCreated(await api.create({ name, description: about, visibility, historyForNew: history })); }
            catch (err) { setError(chatErrorText(err, 'group')); setBusy(false); }
          }}>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={GROUP_NAME_LIMIT} aria-label="Group name" placeholder="Group name" className={field} />
          <textarea value={about} onChange={e => setAbout(e.target.value)} maxLength={GROUP_ABOUT_LIMIT} rows={3} aria-label="About the group" placeholder="What is it about? (optional)" className={field} />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-bold text-[var(--text)]">Who can join</legend>
            {choices.map(c => (
              <label key={c.id} className={`${card} flex items-start gap-3 p-3 ${visibility === c.id ? '!border-[var(--primary)]' : ''}`}>
                <input type="radio" name="visibility" className="mt-1" checked={visibility === c.id} onChange={() => setVisibility(c.id)} />
                <span><span className="block text-sm font-semibold text-[var(--text)]">{c.title}</span><span className="block text-xs text-[var(--text-muted)]">{c.text}</span></span>
              </label>
            ))}
          </fieldset>
          <label className={`${card} flex items-start gap-3 p-3`}>
            <input type="checkbox" className="mt-1" checked={history} onChange={e => setHistory(e.target.checked)} />
            <span><span className="block text-sm font-semibold text-[var(--text)]">Show earlier messages to new members</span><span className="block text-xs text-[var(--text-muted)]">You can’t change this after creating the group.</span></span>
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy || name.trim().length < 3} className={`${primary} w-full`}>{busy ? 'Creating…' : 'Create group'}</button>
        </form>
      )}
    </section>
  );
}

function InvitePanel({ api, token, suspended, onBack, onOpen, onChanged }: {
  api: GroupApi; token: string; suspended: boolean; onBack: () => void; onOpen: (id: string) => void; onChanged: () => Promise<void>;
}) {
  const [found, setFound] = useState<InvitePreview | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setFound(await api.invitePreview(token)); }
    catch (e) { setError(chatErrorText(e, 'group')); setFound(null); }
  }, [api, token]);
  useEffect(() => { load(); }, [load]);

  return (
    <section aria-label="Group invitation" className="flex flex-col h-full min-h-0">
      <PanelHeader title="Invitation" onBack={onBack} />
      <div className="flex-1 min-h-0 overflow-y-auto p-5 text-center">
        {found === undefined && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
        {found === null && <p className="text-sm text-[var(--text-secondary)]">{error || 'This invite link doesn’t work. Ask the group admin for a new one.'}</p>}
        {found && (
          <>
            <span className="inline-block"><Avatar name={found.name} size="w-16 h-16" /></span>
            <h3 className="mt-2 text-xl font-display font-bold text-[var(--text)] break-words">{found.name}</h3>
            {found.description && <p className="mt-1 text-sm text-[var(--text-secondary)] break-words">{found.description}</p>}
            <p className="mt-2 text-xs text-[var(--text-muted)]">Private group · {people(found.members)}. {historyText(found.historyForNew)}</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            {found.status === 'member' ? <button type="button" onClick={() => onOpen(found.id)} className={`${primary} mt-4`}>Open group</button>
              : found.status === 'pending' ? <p role="status" className="mt-4 text-sm font-semibold text-[var(--text)]">Request sent. Waiting for the admin to approve you.</p>
                : suspended ? <div className="mt-4"><SuspendedNotice /></div>
                  : <button type="button" disabled={busy} className={`${primary} mt-4`} onClick={async () => {
                    setBusy(true); setError('');
                    try { await api.requestToJoin(token); await onChanged(); await load(); }
                    catch (e) { setError(chatErrorText(e, 'group')); }
                    setBusy(false);
                  }}>Ask to join</button>}
          </>
        )}
      </div>
    </section>
  );
}

function Discover({ api, tick, suspended, onOpen, onJoined, fail }: {
  api: GroupApi; tick: number; suspended: boolean; onOpen: (id: string) => void; onJoined: (id: string) => Promise<void>; fail: (t: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<PublicGroup[] | null>(null);
  const [busy, setBusy] = useState('');
  const latest = useRef(0);
  useEffect(() => {
    const mine = ++latest.current;
    // wait for a pause in typing before searching
    const timer = setTimeout(() => {
      api.discover(search)
        .then(list => { if (mine === latest.current) setFound(list); })
        .catch(e => { if (mine === latest.current) { fail(chatErrorText(e, 'group')); setFound(current => current ?? []); } });
    }, 300);
    return () => clearTimeout(timer);
  }, [api, search, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} maxLength={60} aria-label="Search public groups" placeholder="Search public groups" className={`${field} mb-2`} />
      <ul className="space-y-2 md:overflow-y-auto md:min-h-0 md:pr-1">
        {found?.map(g => (
          <li key={g.id} className={`${card} p-3`}>
            <div className="flex items-start gap-3">
              <Avatar name={g.name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text)] break-words">{g.name}</p>
                {g.description && <p className="text-sm text-[var(--text-secondary)] line-clamp-2 break-words">{g.description}</p>}
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{people(g.members)} · {g.historyForNew ? 'Earlier messages visible' : 'Starts when you join'}</p>
              </div>
            </div>
            {g.isMember ? <button type="button" onClick={() => onOpen(g.id)} className={`${outline} w-full mt-2`}>Open</button> : (
              <button type="button" disabled={suspended || !!busy || g.members >= GROUP_SIZE} className={`${primary} w-full mt-2`}
                onClick={async () => { setBusy(g.id); try { await api.join(g.id); await onJoined(g.id); } catch (e) { fail(chatErrorText(e, 'group')); } setBusy(''); }}>
                {g.members >= GROUP_SIZE ? 'Full' : busy === g.id ? 'Joining…' : 'Join'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {found === null && <p className="py-6 text-center text-sm text-[var(--text-muted)]">Loading…</p>}
      {found?.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">No public groups found.</p>}
    </>
  );
}

// ---------------------------------------------------------------- the screen

export function GroupScreen({ api, view, onView }: { api: GroupApi; view: GroupView; onView: (v: GroupView) => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'needs-setup' | 'unavailable' | 'error'>('loading');
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState('');
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++latest.current;
    const [list, held] = await Promise.all([api.mine(), api.suspended()]);
    // an older answer arriving late must not undo a newer one
    if (mine !== latest.current) return;
    setGroups(list); setSuspended(held);
  }, [api]);

  // after reading, approving or leaving, the Messages badge counts again
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

  useEffect(() => {
    if (state !== 'ready') return;
    return watchChat(api, () => { refresh().catch(() => {}); setTick(t => t + 1); });
  }, [api, state, refresh]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(''), 3500);
    return () => clearTimeout(timer);
  }, [note]);

  const tab = view.kind === 'discover' ? 'discover' : 'mine';
  const open = view.kind !== 'list' && view.kind !== 'discover';
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 767px)').matches) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, [open]);

  const message = (title: string, text: string, extra?: ReactNode) => (
    <div className="content-wrapper py-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-display font-bold text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{text}</p>
      {extra}
    </div>
  );
  if (state === 'loading') return message('Groups', 'Loading…');
  if (state === 'unavailable') return message('Groups are coming soon', 'Group chat isn’t switched on yet.');
  if (state === 'error') return message('Groups didn’t load', 'Check your connection and try again.', <button type="button" onClick={boot} className={`${primary} mt-4`}>Try again</button>);
  if (state === 'needs-setup') return message('Turn on messages first', 'Groups use the same 18+ switch as messages.', <Link href="/messages" className={`${primary} inline-flex items-center mt-4`}>Go to Messages</Link>);

  const current = view.kind === 'group' || view.kind === 'info' || view.kind === 'study' ? (groups || []).find(g => g.id === view.id) : undefined;
  const back = () => onView({ kind: 'list' });
  const openGroup = async (id: string) => { await changedHere(); onView({ kind: 'group', id }); };

  return (
    <div className="content-wrapper py-3 max-w-5xl mx-auto">
      <div className="md:grid md:grid-cols-[320px_minmax(0,1fr)] md:gap-4 md:h-[calc(100vh-215px)] md:min-h-[460px]">
        <section aria-label="Group list" className="flex flex-col min-h-0">
          <MessagesSwitch active="groups" />
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold text-[var(--text)]">Groups</h1>
            <button type="button" onClick={() => onView({ kind: 'create' })} className={`${small} text-[var(--primary)]`}>+ New group</button>
          </div>
          {suspended && <p role="status" className="mb-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-[var(--text)]">Your chat is suspended. You can read, report and leave, but not send or join.</p>}
          <div role="tablist" className="grid grid-cols-2 mb-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
            {([['mine', 'My groups'], ['discover', 'Discover']] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => onView({ kind: id === 'mine' ? 'list' : 'discover' })} className={`min-h-[44px] text-sm font-semibold border-b-[3px] ${tab === id ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>{label}</button>
            ))}
          </div>
          {tab === 'discover' ? <Discover api={api} tick={tick} suspended={suspended} onOpen={id => onView({ kind: 'group', id })} onJoined={openGroup} fail={setNote} /> : (
            <>
              <ul className="space-y-2 md:overflow-y-auto md:min-h-0 md:pr-1">
                {groups?.map(g => {
                  const badge = g.unread + g.waiting;
                  return (
                    <li key={g.id}>
                      {g.pending ? (
                        <div className={`${card} flex items-center gap-3 p-3`}>
                          <Avatar name={g.name} />
                          <span className="flex-1 min-w-0"><span className="block truncate font-semibold text-[var(--text)]">{g.name}</span><span className="block text-xs text-[var(--text-muted)]">Waiting for approval</span></span>
                          <button type="button" onClick={async () => { try { await api.leave(g.id); setNote('Request cancelled'); await changedHere(); } catch (e) { setNote(chatErrorText(e, 'group')); } }} className={`${small} text-red-600`}>Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => onView({ kind: 'group', id: g.id })} aria-current={current?.id === g.id || undefined} className={`${card} w-full flex items-center gap-3 p-3 text-left ${current?.id === g.id ? '!border-[var(--primary)]' : ''}`}>
                          <Avatar name={g.name} />
                          <span className="flex-1 min-w-0">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-semibold text-[var(--text)]">{g.name}</span>
                              <span className="flex-shrink-0 text-[11px] text-[var(--text-muted)]">{when(g.lastAt)}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={`flex-1 truncate text-sm ${g.unread && !g.muted ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{g.lastBody ? `${g.lastSender}: ${g.lastBody}` : 'No messages yet'}</span>
                              {g.muted && <span className="flex-shrink-0 text-[11px] text-[var(--text-muted)]">Muted</span>}
                              {badge > 0 && <span aria-label={`${g.unread} unread${g.waiting ? `, ${g.waiting} waiting to join` : ''}`} className={`flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${g.muted && !g.waiting ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]' : 'bg-[var(--primary)] text-[var(--bg)]'}`}>{badge > 99 ? '99+' : badge}</span>}
                            </span>
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {groups?.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-muted)]">You’re not in any groups yet. Create one, or look in Discover.</p>}
            </>
          )}
        </section>

        <div className={open
          ? 'fixed inset-0 z-[75] bg-[var(--bg)] md:static md:z-auto md:min-h-0 md:rounded-2xl md:overflow-hidden md:border md:border-[var(--border-subtle)]'
          : 'hidden md:flex md:items-center md:justify-center md:rounded-2xl md:border md:border-dashed md:border-[var(--border)]'}>
          {!open && <p className="text-sm text-[var(--text-muted)]">Choose a group to read it here.</p>}
          {(view.kind === 'group' || view.kind === 'info' || view.kind === 'study') && (!current || current.pending ? (
            <div className="p-8 text-center"><Back onClick={back} /><p className="text-sm text-[var(--text-secondary)]">{!groups ? 'Loading…' : current?.pending ? 'Waiting for the admin to approve you.' : 'This group is no longer available to you.'}</p></div>
          ) : view.kind !== 'info' ? (
            <GroupThread key={current.id} api={api} group={current} tick={tick} suspended={suspended} studying={view.kind === 'study'}
              onTab={study => onView({ kind: study ? 'study' : 'group', id: current.id })} onBack={back} onInfo={() => onView({ kind: 'info', id: current.id })} onChanged={changedHere} say={setNote} />
          ) : (
            <GroupInfo key={current.id} api={api} group={current} tick={tick} suspended={suspended} onBack={() => onView({ kind: 'group', id: current.id })} onChanged={changedHere} onLeft={back} say={setNote} />
          ))}
          {view.kind === 'create' && <CreateGroup api={api} suspended={suspended} onBack={back} onCreated={openGroup} />}
          {view.kind === 'invite' && <InvitePanel key={view.token} api={api} token={view.token} suspended={suspended} onBack={back} onOpen={id => onView({ kind: 'group', id })} onChanged={changedHere} />}
        </div>
      </div>
      {note && <p role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[90] px-4 py-2.5 rounded-full bg-[#050F26] text-white text-sm shadow-2xl">{note}</p>}
    </div>
  );
}
