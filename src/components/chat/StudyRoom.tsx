'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FocusPopup } from '@/components/ShareSheet';
import { REPORT_REASONS, chatErrorText, type ReportReason } from '@/lib/chat/types';
import {
  NOTE_LIMIT, NOTHING_NOW, STUCK_TEXT, TIMERS, bookSlug, splitPages,
  type StudyApi, type StudyItem, type StudyNow, type StudyQuestion,
} from '@/lib/chat/study';
import { card, outline, primary } from './ChatScreen';

const field = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-[16px] text-[var(--text)]';
const link = 'min-h-[36px] text-xs font-semibold';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Runs `work` now and every `ms`, but only while the page is in view. */
function useWhileVisible(work: () => void, ms: number) {
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') work(); };
    tick();
    const timer = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [work, ms]);
}

type Target = { kind: 'item' | 'question' | 'answer'; id: string };

function StudyReport({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: ReportReason) => Promise<void> }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <FocusPopup label="Report study content" onClose={onClose}>
      <div className="max-h-[75vh] overflow-y-auto">
        <p className="font-serif-title text-lg font-bold text-[var(--text)]">Report this</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Our team receives a copy and can see which account posted it. The group is not told who reported it.</p>
        <fieldset className="mt-3">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map(r => (
            <label key={r.id} className="flex items-center gap-3 min-h-[40px] text-sm text-[var(--text)]">
              <input type="radio" name="study-reason" checked={reason === r.id} onChange={() => setReason(r.id)} />{r.label}
            </label>
          ))}
        </fieldset>
        <button type="button" disabled={!reason || busy} onClick={async () => { setBusy(true); await onSubmit(reason!); }} className={`${primary} w-full mt-2`}>Send report</button>
      </div>
    </FocusPopup>
  );
}

// ---------------------------------------------------------------- the timer

/** A shared timer when staff start one; otherwise anyone can run a private one on their own screen. */
function FocusTimer({ shared, canShare, onShare }: { shared: StudyNow['timer']; canShare: boolean; onShare: (kind: 'focus' | 'break', minutes: number) => void }) {
  const [own, setOwn] = useState<{ kind: 'focus' | 'break'; endsAt: number } | null>(null);
  const [sharedEnds, setSharedEnds] = useState(0);
  const [, setBeat] = useState(0);
  useEffect(() => { setSharedEnds(shared ? Date.now() + shared.secondsLeft * 1000 : 0); }, [shared?.kind, shared?.secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = !!own || sharedEnds > 0;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setBeat(b => b + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const left = (end: number) => Math.max(0, Math.round((end - Date.now()) / 1000));
  const sharedLeft = shared ? left(sharedEnds) : 0;
  const ownLeft = own ? left(own.endsAt) : 0;
  const word = (kind: 'focus' | 'break') => (kind === 'focus' ? 'Focus time' : 'Break');

  return (
    <div className={`${card} p-3`}>
      {shared && sharedLeft > 0 ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm text-[var(--text)]"><span className="font-bold">{word(shared.kind)} together</span> <span role="timer" className="tabular-nums font-bold text-[var(--primary)]">{clock(sharedLeft)}</span></p>
          {canShare && <button type="button" onClick={() => onShare(shared.kind, 0)} className={`${link} text-red-600`}>Stop for everyone</button>}
        </div>
      ) : own ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm text-[var(--text)]">{ownLeft > 0 ? <><span className="font-bold">Your {word(own.kind).toLowerCase()}</span> <span role="timer" className="tabular-nums font-bold text-[var(--primary)]">{clock(ownLeft)}</span></> : <span role="status" className="font-bold">Well done. {own.kind === 'focus' ? 'Take a break if you like.' : 'Ready when you are.'}</span>}</p>
          <button type="button" onClick={() => setOwn(null)} className={`${link} text-[var(--primary)]`}>{ownLeft > 0 ? 'Stop' : 'Close'}</button>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text-muted)] mb-2">Study at your own pace. A timer is here if it helps.</p>
          <div className="grid grid-cols-2 gap-2">
            {TIMERS.map(t => <button key={t.kind} type="button" onClick={() => setOwn({ kind: t.kind, endsAt: Date.now() + t.minutes * 60000 })} className={outline}>{t.label}</button>)}
          </div>
          {canShare && <button type="button" onClick={() => onShare('focus', 25)} className={`${link} mt-1 text-[var(--primary)]`}>Start 25 minutes for everyone</button>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- adding to the shelf

function AddToShelf({ api, groupId, onAdded }: { api: StudyApi; groupId: string; onAdded: (id: string) => void }) {
  const [adding, setAdding] = useState<'note' | 'book' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(''); setBusy(true);
    try {
      if (adding === 'note') onAdded(await api.addNote(groupId, title, body));
      else {
        const slug = bookSlug(address);
        if (!slug) throw new Error('chat:book-not-found');
        onAdded(await api.addBook(groupId, slug));
      }
      setAdding(null); setTitle(''); setBody(''); setAddress('');
    } catch (e) { setError(chatErrorText(e, 'group')); }
    setBusy(false);
  };
  if (!adding) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAdding('note')} className={primary}>+ Add notes</button>
        <button type="button" onClick={() => setAdding('book')} className={outline}>+ Add a book</button>
      </div>
    );
  }
  return (
    <form className={`${card} p-3 space-y-2`} onSubmit={e => { e.preventDefault(); submit(); }}>
      {adding === 'note' ? (
        <>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} aria-label="Notes title" placeholder="Title, for example Lecture 4" className={field} />
          <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={NOTE_LIMIT} rows={8} aria-label="Notes" placeholder="Type or paste your notes. A line with only --- starts a new page." className={field} />
          <p className="text-[11px] text-[var(--text-muted)]">{body.length.toLocaleString()} of {NOTE_LIMIT.toLocaleString()} characters. Only share notes you’re allowed to share.</p>
        </>
      ) : (
        <>
          <input value={address} onChange={e => setAddress(e.target.value)} maxLength={300} aria-label="Book address" placeholder="Paste a book’s address from ANYFREEBOOK" className={field} />
          <p className="text-[11px] text-[var(--text-muted)]">For works published on ANYFREEBOOK. The address contains /read/.</p>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { setAdding(null); setError(''); }} className={outline}>Cancel</button>
        <button type="submit" disabled={busy || (adding === 'note' ? title.trim().length < 3 || !body.trim() : !address.trim())} className={primary}>{busy ? 'Adding…' : 'Add to shelf'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- questions

function Question({ q, canPost, onAnswer, onResolve, onRemove, onReport }: {
  q: StudyQuestion; canPost: boolean;
  onAnswer: (body: string) => Promise<boolean>; onResolve: () => void; onRemove: (answerId: string | null) => void; onReport: (t: Target) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  return (
    <li className={`${card} p-3`}>
      <p className="text-[11px] font-semibold text-[var(--text-muted)]">{q.author ?? 'No name'}{q.mine && !q.author ? ' (your question)' : ''}{q.answered && <span className="ml-1.5 text-emerald-700 dark:text-emerald-300">✓ Answered</span>}</p>
      <p className="text-sm text-[var(--text)] whitespace-pre-wrap break-words">{q.body}</p>
      {q.answers.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-l-[3px] border-[var(--primary)] pl-2.5">
          {q.answers.map(a => (
            <li key={a.id}>
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words"><span className="font-semibold text-[var(--text)]">{a.name ?? 'The asker'}: </span>{a.body}</p>
              <span className="flex gap-3">
                {!a.mine && <button type="button" onClick={() => onReport({ kind: 'answer', id: a.id })} className={`${link} text-[var(--text-muted)]`}>Report</button>}
                {a.canRemove && <button type="button" onClick={() => onRemove(a.id)} className={`${link} text-red-600`}>Delete</button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-x-4">
        {canPost && <button type="button" onClick={() => setReplying(r => !r)} className={`${link} text-[var(--primary)]`}>Help answer</button>}
        {q.canResolve && <button type="button" onClick={onResolve} className={`${link} text-[var(--primary)]`}>{q.answered ? 'Reopen' : 'Mark answered'}</button>}
        {!q.mine && <button type="button" onClick={() => onReport({ kind: 'question', id: q.id })} className={`${link} text-[var(--text-muted)]`}>Report</button>}
        {q.canRemove && <button type="button" onClick={() => onRemove(null)} className={`${link} text-red-600`}>Delete question</button>}
      </div>
      {replying && (
        <form className="mt-1 flex items-end gap-2" onSubmit={async e => { e.preventDefault(); if (await onAnswer(text)) { setText(''); setReplying(false); } }}>
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={2} aria-label="Your answer" placeholder="Your answer (shows your name)" className={`${field} flex-1`} />
          <button type="submit" disabled={!text.trim()} className={primary}>Send</button>
        </form>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- reading one item

function Reader({ api, groupId, item, page, onPage, now, canPost, canLead, onBack, onChanged, say }: {
  api: StudyApi; groupId: string; item: StudyItem; page: number; onPage: (p: number) => void; now: StudyNow; canPost: boolean; canLead: boolean;
  onBack: () => void; onChanged: () => void; say: (t: string) => void;
}) {
  const [body, setBody] = useState<string | null>(null);
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [text, setText] = useState('');
  const [noName, setNoName] = useState(false);
  const [reporting, setReporting] = useState<Target | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (item.kind !== 'note') { setBody(''); return; }
    let live = true;
    api.read(groupId, item.id).then(b => { if (live) setBody(b); }).catch(e => { if (live) { setError(chatErrorText(e, 'group')); setBody(''); } });
    return () => { live = false; };
  }, [api, groupId, item.id, item.kind]);

  const loadQuestions = useCallback(() => {
    const mine = ++latest.current;
    api.questions(groupId, item.id).then(q => { if (mine === latest.current) setQuestions(q); }).catch(() => {});
  }, [api, groupId, item.id]);
  useWhileVisible(loadQuestions, 15_000);

  const pages = useMemo(() => (body === null ? [] : splitPages(body)), [body]);
  const isNote = item.kind === 'note';
  const shown = isNote ? Math.min(Math.max(1, page), Math.max(1, pages.length)) : 1;
  useEffect(() => { top.current?.scrollIntoView({ block: 'nearest' }); }, [shown]);

  const act = async (work: () => Promise<unknown>, done?: string) => {
    setError('');
    try { await work(); if (done) say(done); loadQuestions(); onChanged(); return true; }
    catch (e) { setError(chatErrorText(e, 'group')); return false; }
  };
  const here = questions.filter(q => !isNote || q.page === shown);
  const elsewhere = Array.from(new Set(questions.filter(q => isNote && !q.answered && q.page !== shown).map(q => q.page))).sort((a, b) => a - b);
  const presentingThis = now.iPresent && now.itemId === item.id;

  return (
    <div ref={top} className="space-y-3">
      <button type="button" onClick={onBack} className={`${link} text-[var(--primary)]`}>← Study shelf</button>
      <h3 className="text-lg font-display font-bold text-[var(--text)] break-words">{item.title}</h3>

      {isNote ? (
        <>
          <article aria-label={`Page ${shown}`} className={`${card} p-4 min-h-[160px]`}>
            {body === null ? <p className="text-sm text-[var(--text-muted)]">Loading…</p> : <p className="text-[16px] leading-7 text-[var(--text)] whitespace-pre-wrap break-words">{pages[shown - 1]}</p>}
          </article>
          <nav aria-label="Pages" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button type="button" disabled={shown <= 1} onClick={() => onPage(shown - 1)} className={outline}>‹ Previous</button>
            <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Page {shown} of {Math.max(1, pages.length)}</span>
            <button type="button" disabled={shown >= pages.length} onClick={() => onPage(shown + 1)} className={outline}>Next ›</button>
          </nav>
          {canLead && (presentingThis
            ? <button type="button" onClick={() => act(() => api.stopPresenting(groupId), 'You stopped presenting')} className={`${outline} w-full`}>Stop presenting</button>
            : <button type="button" onClick={() => act(() => api.present(groupId, item.id, shown), 'You are presenting. Others can follow.')} className={`${outline} w-full`}>Present these notes</button>)}
        </>
      ) : item.slug ? (
        <div className={`${card} p-4`}>
          <p className="text-sm text-[var(--text-secondary)]">Read the book in a new tab, then come back to ask or answer questions here. Its page has the reading tools.</p>
          <Link href={`/read/${item.slug}`} target="_blank" className={`${primary} inline-flex items-center mt-3`}>Open the book</Link>
        </div>
      ) : <p className={`${card} p-4 text-sm text-[var(--text-secondary)]`}>This book is no longer available.</p>}

      <h4 className="pt-1 text-sm font-bold text-[var(--text)]">{isNote ? `Questions on page ${shown}` : 'Questions about this book'}</h4>
      {elsewhere.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">Open questions on {elsewhere.map(p => <button key={p} type="button" onClick={() => onPage(p)} className="mx-0.5 min-h-[32px] px-2 rounded-lg font-semibold text-[var(--primary)] bg-[var(--primary-light)]">page {p}</button>)}</p>
      )}
      <ul className="space-y-2">
        {here.map(q => (
          <Question key={q.id} q={q} canPost={canPost}
            onAnswer={t => act(() => api.answer(groupId, q.id, t))}
            onResolve={() => act(() => api.resolve(groupId, q.id, !q.answered))}
            onRemove={a => act(() => api.removePost(groupId, q.id, a), 'Deleted')}
            onReport={setReporting} />
        ))}
      </ul>
      {here.length === 0 && <p className="text-sm text-[var(--text-muted)]">No questions yet.</p>}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {canPost && (
        <form className={`${card} p-3 space-y-2`} onSubmit={async e => { e.preventDefault(); if (await act(() => api.ask(groupId, item.id, shown, text, noName), 'Question posted')) setText(''); }}>
          <button type="button" onClick={() => act(() => api.ask(groupId, item.id, shown, STUCK_TEXT, true), 'Asked without your name')} className={`${outline} w-full`}>🙋 I’m stuck (no name)</button>
          <textarea value={text} onChange={e => setText(e.target.value)} maxLength={500} rows={2} aria-label="Your question" placeholder="Ask a question" className={field} />
          <label className="flex items-start gap-3 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" className="mt-0.5" checked={noName} onChange={e => setNoName(e.target.checked)} />
            <span>Ask without my name. Members and the group admin won’t see who asked. Our safety team can, if it is reported.</span>
          </label>
          <button type="submit" disabled={!text.trim()} className={`${primary} w-full`}>Post question</button>
        </form>
      )}

      <div className="flex gap-4">
        <button type="button" onClick={() => setReporting({ kind: 'item', id: item.id })} className={`${link} text-[var(--text-muted)]`}>Report this {isNote ? 'note' : 'item'}</button>
        {item.canRemove && <button type="button" onClick={() => setRemoving(true)} className={`${link} text-red-600`}>Remove from shelf</button>}
      </div>

      {reporting && <StudyReport onClose={() => setReporting(null)} onSubmit={async reason => { await act(() => api.report(groupId, reporting.kind, reporting.id, reason, ''), 'Report sent'); setReporting(null); }} />}
      {removing && (
        <FocusPopup label="Remove from shelf" onClose={() => setRemoving(false)}>
          <p className="font-serif-title text-lg font-bold text-[var(--text)]">Remove “{item.title}”?</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">It and its questions disappear for the whole group.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button type="button" onClick={() => setRemoving(false)} className={outline}>Cancel</button>
            <button type="button" onClick={async () => { setRemoving(false); if (await act(() => api.removeItem(groupId, item.id), 'Removed')) onBack(); }} className="min-h-[46px] rounded-xl bg-red-600 text-white text-sm font-semibold">Remove</button>
          </div>
        </FocusPopup>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the room

export function StudyRoom({ api, groupId, canPost, canLead, say }: {
  api: StudyApi; groupId: string;
  /** False while suspended or paused. */
  canPost: boolean;
  /** May present and run the shared timer. */
  canLead: boolean;
  say: (t: string) => void;
}) {
  const [shelf, setShelf] = useState<StudyItem[] | null>(null);
  const [now, setNow] = useState<StudyNow>(NOTHING_NOW);
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState('');
  const latestShelf = useRef(0);
  const latestNow = useRef(0);

  const loadShelf = useCallback(() => {
    const mine = ++latestShelf.current;
    api.shelf(groupId).then(s => { if (mine === latestShelf.current) { setShelf(s); setError(''); } })
      .catch(e => { if (mine === latestShelf.current) { setError(chatErrorText(e, 'group')); setShelf(current => current ?? []); } });
  }, [api, groupId]);
  const loadNow = useCallback(() => {
    const mine = ++latestNow.current;
    api.now(groupId).then(n => { if (mine === latestNow.current) setNow(n); }).catch(() => {});
  }, [api, groupId]);
  useWhileVisible(loadShelf, 20_000);
  // quick enough to follow a presenter
  useWhileVisible(loadNow, 4_000);

  // following moves only when the reader has chosen to
  useEffect(() => {
    if (!following) return;
    if (!now.presenter || now.iPresent || !now.itemId) { setFollowing(false); return; }
    setOpen(now.itemId); setPage(now.page);
    if (!shelf?.some(i => i.id === now.itemId)) loadShelf();
  }, [following, now.presenter, now.iPresent, now.itemId, now.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const lead = async (work: () => Promise<unknown>) => {
    setError('');
    try { await work(); loadNow(); }
    catch (e) { setError(chatErrorText(e, 'group')); }
  };

  const item = shelf?.find(i => i.id === open);
  const turn = (next: number) => {
    setPage(next);
    if (following) setFollowing(false);
    // the presenter's page turns are shared
    if (now.iPresent && item && now.itemId === item.id) lead(() => api.present(groupId, item.id, next));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <FocusTimer shared={now.timer} canShare={canLead} onShare={(kind, minutes) => lead(() => api.timer(groupId, kind, minutes))} />

      {now.presenter && !now.iPresent && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--primary)] bg-[var(--primary-light)] p-3">
          <p className="flex-1 min-w-[160px] text-sm text-[var(--text)]"><span className="font-bold">{now.presenter}</span> is presenting page {now.page}.{following ? ' You’re following.' : ''}</p>
          <button type="button" onClick={() => setFollowing(f => !f)} className={following ? outline : primary}>{following ? 'Read at my pace' : 'Follow along'}</button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {item ? (
        <Reader key={item.id} api={api} groupId={groupId} item={item} page={page} onPage={turn} now={now} canPost={canPost} canLead={canLead}
          onBack={() => { setOpen(null); setFollowing(false); }} onChanged={() => { loadShelf(); loadNow(); }} say={say} />
      ) : (
        <>
          {canPost && <AddToShelf api={api} groupId={groupId} onAdded={id => { loadShelf(); setPage(1); setOpen(id); say('Added to the study shelf'); }} />}
          <h3 className="text-sm font-bold text-[var(--text)]">Study shelf</h3>
          <p className="-mt-2 text-xs text-[var(--text-muted)]">Everyone in the group, including people who join later, can see what is here and its questions.</p>
          {shelf === null && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}
          {shelf?.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-muted)]">The shelf is empty. Add lecture notes or a book to study together.</p>}
          <ul className="space-y-2">
            {shelf?.map(i => (
              <li key={i.id}>
                <button type="button" onClick={() => { setPage(1); setFollowing(false); setOpen(i.id); }} className={`${card} w-full flex items-start gap-3 p-3 text-left`}>
                  <span aria-hidden className="text-2xl">{i.kind === 'note' ? '📝' : '📘'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[var(--text)] break-words">{i.title}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{i.kind === 'note' ? 'Notes' : 'Book'} · added by {i.addedBy}</span>
                    {i.openQuestions > 0 && <span className="block text-xs font-semibold text-[var(--primary)]">{i.openQuestions} open {i.openQuestions === 1 ? 'question' : 'questions'}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
