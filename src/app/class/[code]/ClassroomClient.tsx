'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  joinAttendance, sendClassroomMessage, listClassroomMessages, subscribeClassroom,
  setClassroomStatus, saveRecordingUrl, trackPresence, bumpPeakAttendance, setClassroomMaterial,
  type ClassroomMessage,
} from '@/lib/classrooms/client';
import { uploadPublicationFile } from '@/lib/creators/client';
import { createClient } from '@/lib/supabase/client';
import { LiveStage } from '@/components/LiveStage';
import { DocumentReader } from '@/components/DocumentReader';
import type { ClassroomWithHost } from '@/lib/classrooms/server';
import { getSessionKey } from '@/lib/creators/client';

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ClassroomClient({ room: initialRoom, inviteToken }: { room: ClassroomWithHost; inviteToken: string | null }) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attendance, setAttendance] = useState<number>(0);
  const [watching, setWatching] = useState<number>(0);
  const [countdown, setCountdown] = useState('');
  const [recordingDraft, setRecordingDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);   // user explicitly entered the video room
  const [materialDraft, setMaterialDraft] = useState('');
  const [materialBusy, setMaterialBusy] = useState(false);
  const [myPubs, setMyPubs] = useState<{ id: string; title: string; slug: string; external_url: string | null }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = user?.id === room.host_id;

  // Host's published works — one tap shows the book/PDF they teach from
  useEffect(() => {
    if (!isHost || !user) return;
    const sb = createClient();
    sb.from('publications')
      .select('id, title, slug, external_url')
      .eq('author_id', user.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setMyPubs(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, user?.id]);
  const displayName = profile?.display_name || user?.email?.split('@')[0] || null;

  // Attendance + chat history + live subscriptions + realtime presence
  useEffect(() => {
    joinAttendance(room.id, getSessionKey(), displayName).then(setAttendance);
    listClassroomMessages(room.id).then(setMessages);
    const unsubscribe = subscribeClassroom(
      room.id,
      m => setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]),
      patch => setRoom(prev => ({ ...prev, ...patch }))
    );
    const stopPresence = trackPresence(room.id, getSessionKey(), setWatching);
    return () => { unsubscribe(); stopPresence(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  // The host's browser persists the concurrent-viewers high-water mark (RLS: hosts only)
  useEffect(() => {
    if (isHost && watching > 0) bumpPeakAttendance(room.id, watching);
  }, [isHost, watching, room.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Countdown for scheduled classes
  useEffect(() => {
    if (room.status !== 'scheduled') return;
    const tick = () => {
      const ms = new Date(room.scheduled_at).getTime() - Date.now();
      if (ms <= 0) { setCountdown('starting soon'); return; }
      const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [room.status, room.scheduled_at]);

  const send = async () => {
    if (!draft.trim()) return;
    const body = draft;
    setDraft('');
    const { error } = await sendClassroomMessage(room.id, body);
    if (error) setDraft(body);
  };

  const startClass = async () => {
    setBusy(true);
    const { error } = await setClassroomStatus(room.id, 'live');
    setBusy(false);
    if (error) { alert(`Could not start the class: ${error}`); return; }
    setRoom(r => ({ ...r, status: 'live' }));
    setJoined(true); // host goes straight into the room
  };
  const endClass = async () => {
    if (!confirm('End this class for everyone?')) return;
    setBusy(true); await setClassroomStatus(room.id, 'ended'); setRoom(r => ({ ...r, status: 'ended' })); setBusy(false);
  };
  const attachRecording = async () => {
    if (!recordingDraft.trim()) return;
    setBusy(true);
    await saveRecordingUrl(room.id, recordingDraft.trim());
    setRoom(r => ({ ...r, recording_url: recordingDraft.trim() }));
    setBusy(false);
  };

  const shareMaterialFile = async (f: File | null) => {
    if (!f) return;
    setMaterialBusy(true);
    const { error, url } = await uploadPublicationFile(f);
    if (error || !url) { setMaterialBusy(false); alert(error || 'Upload failed — try again.'); return; }
    const { error: setErr } = await setClassroomMaterial(room.id, url, f.name);
    setMaterialBusy(false);
    if (setErr) { alert(setErr); return; }
    setRoom(r => ({ ...r, material_url: url, material_title: f.name }));
  };

  const shareMaterialLink = async () => {
    const url = materialDraft.trim();
    if (!url) return;
    setMaterialBusy(true);
    const { error } = await setClassroomMaterial(room.id, url, null);
    setMaterialBusy(false);
    if (error) { alert(error); return; }
    setRoom(r => ({ ...r, material_url: url, material_title: null }));
    setMaterialDraft('');
  };

  const showPublication = async (pub: { title: string; slug: string; external_url: string | null }) => {
    // Prefer the uploaded PDF; fall back to embedding our own reader page
    const url = pub.external_url || `/read/${pub.slug}`;
    setMaterialBusy(true);
    const { error } = await setClassroomMaterial(room.id, url, pub.title);
    setMaterialBusy(false);
    if (error) { alert(error); return; }
    setRoom(r => ({ ...r, material_url: url, material_title: pub.title }));
  };

  const clearMaterial = async () => {
    setMaterialBusy(true);
    await setClassroomMaterial(room.id, null, null);
    setMaterialBusy(false);
    setRoom(r => ({ ...r, material_url: null, material_title: null }));
  };

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/class/${room.room_code}${inviteToken ? `?t=${inviteToken}` : ''}`
    : '';


  return (
    <div className="content-wrapper py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {room.status === 'live' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
              </span>
            )}
            {room.status === 'scheduled' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold uppercase">Scheduled</span>
            )}
            {room.status === 'ended' && (
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold uppercase">Replay</span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              {room.status === 'live'
                ? <>👥 <strong className="text-[var(--text)]">{watching}</strong> watching now · {attendance} joined</>
                : <>👥 {attendance} joined</>}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-[var(--text)] mt-1">{room.title}</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Hosted by{' '}
            {room.host?.creator_handle ? (
              <Link href={`/author/${room.host.creator_handle}`} className="text-[var(--primary)] hover:underline">{room.host.display_name || 'Author'}</Link>
            ) : (room.host?.display_name || 'Author')}
            {' '}· {fmtWhen(room.scheduled_at)} · {room.duration_min} min
          </p>
        </div>
        <div className="flex items-center gap-2">
          {room.publication && (
            <Link href={`/read/${room.publication.slug}`} target="_blank" className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
              📖 Read along: {room.publication.title.slice(0, 24)}{room.publication.title.length > 24 ? '…' : ''}
            </Link>
          )}
          <button onClick={() => navigator.clipboard.writeText(shareLink)} className="px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            🔗 Copy link
          </button>
          {isHost && room.status === 'scheduled' && (
            <button onClick={startClass} disabled={busy} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-60">
              ● Start class
            </button>
          )}
          {isHost && room.status === 'live' && (
            <button onClick={endClass} disabled={busy} className="px-4 py-2 rounded-xl border-2 border-red-500 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60">
              End class
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main area: video / countdown / replay */}
        <div className="lg:col-span-2">
          {room.status === 'live' && (
            joined ? (
              <div>
                <LiveStage classroomId={room.id} isHost={isHost} />
                <p className="text-[10px] text-[var(--text-muted)] text-right mt-1">
                  Video trouble?{' '}
                  <a
                    href={`https://meet.jit.si/anyfreebook-${room.room_code}#userInfo.displayName="${encodeURIComponent(displayName || 'Student')}"`}
                    target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--primary)]"
                  >
                    open the backup room
                  </a>
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-red-500/40 bg-[var(--surface)] flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 380 }}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold uppercase mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now
                </span>
                <p className="text-5xl mb-4">🎓</p>
                <p className="font-bold text-lg text-[var(--text)]">The class is in session</p>
                <p className="text-sm text-[var(--text-muted)] mt-1 mb-6">👥 {watching > 0 ? `${watching} watching now` : 'Be the first in the room'}</p>
                <button
                  onClick={() => setJoined(true)}
                  className="px-8 py-3.5 rounded-xl bg-red-500 text-white text-base font-bold hover:bg-red-600 hover:shadow-lg transition-all"
                >
                  ▶ Join classroom
                </button>
                <p className="text-[11px] text-[var(--text-muted)] mt-4">
                  {isHost ? 'Your browser will ask for camera & microphone access.' : 'Just watch and chat — no camera or microphone needed.'}
                </p>
              </div>
            )
          )}

          {room.status === 'scheduled' && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 380 }}>
              <p className="text-5xl mb-4">⏳</p>
              <p className="text-sm text-[var(--text-muted)]">Class starts in</p>
              <p className="text-4xl font-bold font-mono text-[var(--text)] mt-1">{countdown}</p>
              {isHost ? (
                <>
                  <button
                    onClick={startClass}
                    disabled={busy}
                    className="mt-6 px-8 py-3.5 rounded-xl bg-red-500 text-white text-base font-bold hover:bg-red-600 hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {busy ? 'Starting…' : '● Start class now'}
                  </button>
                  <p className="text-xs text-[var(--text-muted)] mt-3 max-w-sm">
                    You can start early — everyone on this page joins the moment you do.
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--text-muted)] mt-4 max-w-sm">
                  {user
                    ? 'Keep this page open — a "Join classroom" button appears the moment the host starts. Say hi in the chat meanwhile!'
                    : 'A "Join classroom" button appears here the moment the host starts. Hosting this class yourself? Sign in to see your Start button.'}
                </p>
              )}
              {room.description && <p className="text-sm text-[var(--text-secondary)] mt-5 max-w-md">{room.description}</p>}
            </div>
          )}

          {room.status === 'ended' && (
            <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface)]">
              {room.recording_url ? (
                <video src={room.recording_url} controls className="w-full bg-black" style={{ maxHeight: '65vh' }} />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 320 }}>
                  <p className="text-5xl mb-3">🎬</p>
                  <p className="font-semibold text-[var(--text)]">This class has ended</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {isHost ? 'Attach the recording below so students can replay it.' : 'The host hasn\'t posted a recording yet — check back soon.'}
                  </p>
                </div>
              )}
              {isHost && (
                <div className="p-4 border-t border-[var(--border-subtle)] flex gap-2">
                  <input
                    value={recordingDraft}
                    onChange={e => setRecordingDraft(e.target.value)}
                    placeholder="Paste recording URL (upload the file in your studio, or a YouTube/Drive link)"
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)] outline-none focus:border-[var(--primary)]"
                  />
                  <button onClick={attachRecording} disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold disabled:opacity-60">
                    Attach
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Shared class material — synced live to everyone via the classroom subscription */}
          {room.status !== 'ended' && (room.material_url || isHost) && (
            <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)]">
                <p className="text-xs font-bold text-[var(--text)] truncate">
                  📄 {room.material_url ? (room.material_title || 'Class material') : 'Show a document to the class'}
                </p>
                {isHost && room.material_url && (
                  <button onClick={clearMaterial} disabled={materialBusy} className="text-[11px] font-semibold text-red-500 hover:underline flex-shrink-0 disabled:opacity-60">
                    Stop showing
                  </button>
                )}
              </div>

              {room.material_url ? (
                <div className="p-2">
                  <DocumentReader url={room.material_url} title={room.material_title || 'Class material'} height="60vh" />
                </div>
              ) : isHost && (
                <div className="p-4 space-y-2">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Upload a PDF, image or slides — it appears instantly on every student&apos;s screen (works great on phones, no screen share needed).
                  </p>
                  {myPubs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">📚 Teach from your published work:</span>
                      {myPubs.map(pub => (
                        <button
                          key={pub.id}
                          onClick={() => showPublication(pub)}
                          disabled={materialBusy}
                          className="px-2.5 py-1 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] text-[11px] font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-60 max-w-[220px] truncate"
                        >
                          {pub.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className={`px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold cursor-pointer ${materialBusy ? 'opacity-60 pointer-events-none' : 'hover:shadow-md'}`}>
                      {materialBusy ? 'Uploading…' : '⬆ Upload document'}
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx" className="hidden" onChange={e => shareMaterialFile(e.target.files?.[0] || null)} />
                    </label>
                    <input
                      value={materialDraft}
                      onChange={e => setMaterialDraft(e.target.value)}
                      placeholder="…or paste a link (PDF, Google Slides, Drive)"
                      className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)] outline-none focus:border-[var(--primary)]"
                    />
                    <button onClick={shareMaterialLink} disabled={materialBusy || !materialDraft.trim()} className="px-4 py-2 rounded-lg border-2 border-[var(--primary)] text-[var(--primary)] text-xs font-semibold disabled:opacity-50">
                      Show it
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col" style={{ height: '65vh', minHeight: 420 }}>
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text)]">💬 Class chat</h2>
            <span className="text-[10px] text-[var(--text-muted)]">{messages.length} messages</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">No messages yet — be the first to say hello 👋</p>
            )}
            {messages.map(m => (
              <div key={m.id} className="text-sm">
                <span className={`font-semibold ${m.user_id === room.host_id ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>
                  {m.display_name}{m.user_id === room.host_id ? ' (host)' : ''}:
                </span>{' '}
                <span className="text-[var(--text-secondary)]">{m.body}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-[var(--border-subtle)]">
            {user ? (
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') send(); }}
                  placeholder="Say something…"
                  maxLength={500}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
                <button onClick={send} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold">Send</button>
              </div>
            ) : (
              <a href={`/login?redirect=/class/${room.room_code}${inviteToken ? `%3Ft%3D${inviteToken}` : ''}`} className="block text-center text-xs font-semibold text-[var(--primary)] hover:underline py-1.5">
                Sign in to join the chat →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
