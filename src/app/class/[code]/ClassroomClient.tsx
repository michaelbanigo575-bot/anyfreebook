'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  joinAttendance, sendClassroomMessage, listClassroomMessages, subscribeClassroom,
  setClassroomStatus, saveRecordingUrl,
  type ClassroomMessage,
} from '@/lib/classrooms/client';
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
  const [countdown, setCountdown] = useState('');
  const [recordingDraft, setRecordingDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = user?.id === room.host_id;
  const displayName = profile?.display_name || user?.email?.split('@')[0] || null;

  // Attendance + chat history + live subscriptions
  useEffect(() => {
    joinAttendance(room.id, getSessionKey(), displayName).then(setAttendance);
    listClassroomMessages(room.id).then(setMessages);
    const unsubscribe = subscribeClassroom(
      room.id,
      m => setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]),
      patch => setRoom(prev => ({ ...prev, ...patch }))
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

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

  const startClass = async () => { setBusy(true); await setClassroomStatus(room.id, 'live'); setRoom(r => ({ ...r, status: 'live' })); setBusy(false); };
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

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/class/${room.room_code}${inviteToken ? `?t=${inviteToken}` : ''}`
    : '';

  const jitsiRoom = `anyfreebook-${room.room_code}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#userInfo.displayName="${encodeURIComponent(displayName || 'Student')}"&config.prejoinConfig.enabled=true`;

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
            <span className="text-xs text-[var(--text-muted)]">👥 {attendance} joined</span>
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
            <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-black">
              <iframe
                src={jitsiUrl}
                title={room.title}
                className="w-full"
                style={{ height: '65vh', minHeight: 420 }}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              />
            </div>
          )}

          {room.status === 'scheduled' && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 380 }}>
              <p className="text-5xl mb-4">⏳</p>
              <p className="text-sm text-[var(--text-muted)]">Class starts in</p>
              <p className="text-4xl font-bold font-mono text-[var(--text)] mt-1">{countdown}</p>
              <p className="text-xs text-[var(--text-muted)] mt-4 max-w-sm">
                {isHost
                  ? 'When you\'re ready, hit "Start class" above — the live video room opens for everyone on this page.'
                  : 'Keep this page open — the video appears automatically when the host starts. Say hi in the chat meanwhile!'}
              </p>
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
