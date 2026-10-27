'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listClassroomSessions,
  getClassroomHistorySummary,
  type ClassroomSessionWithAttendance,
} from '@/lib/classrooms/client';

/**
 * The host's view of a classroom's history.
 *
 * Every session the class has run, how long it lasted, and who was there.
 * A signed-in attendee is shown by their profile name; an anonymous one by
 * the name they typed in, with a stable guest id so the host can recognise a
 * returning guest.
 */
export function ClassroomHistory({ classroomId, roomCode }: { classroomId: string; roomCode: string }) {
  const [sessions, setSessions] = useState<ClassroomSessionWithAttendance[] | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getClassroomHistorySummary>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, stats] = await Promise.all([
          listClassroomSessions(classroomId),
          getClassroomHistorySummary(classroomId),
        ]);
        if (cancelled) return;
        setSessions(list);
        setSummary(stats);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the history');
      }
    })();
    return () => { cancelled = true; };
  }, [classroomId]);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (!sessions) {
    return <p className="text-sm text-[var(--text-muted)]">Loading history…</p>;
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No sessions yet. The history starts when you go live — every session is
        timed, and everyone who joins is recorded.
      </p>
    );
  }

  const fmtDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
  };

  const fmtWhen = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Sessions', value: String(summary.sessions) },
            { label: 'Attendances', value: String(summary.totalAttendees) },
            { label: 'Unique people', value: String(summary.uniqueAttendees) },
            { label: 'Time taught', value: fmtDuration(summary.totalSeconds) },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3"
            >
              <p className="text-lg font-bold text-[var(--text)] leading-tight">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <ol className="space-y-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-[var(--text)] text-sm">
                {fmtWhen(s.started_at)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {fmtDuration(s.duration_seconds)} · {s.attendee_count}{' '}
                {s.attendee_count === 1 ? 'attendee' : 'attendees'}
                {s.ended_at ? '' : ' · live'}
              </p>
            </div>

            {s.attendees.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {s.attendees.map((a) => (
                  <li
                    key={a.id}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"
                    title={
                      a.user_id
                        ? 'Signed-in attendee'
                        : `Guest ${a.guest_id || ''}`
                    }
                  >
                    {a.display_name}
                    {!a.user_id && (
                      <span className="ml-1 text-[10px] uppercase text-[var(--text-muted)]">
                        guest
                      </span>
                    )}
                    {a.watch_seconds > 0 && (
                      <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
                        {Math.round(a.watch_seconds / 60)}m
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-muted)]">Nobody was recorded in this session.</p>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        <Link href={`/class/${roomCode}`} className="text-[var(--primary)] hover:underline">
          Back to the class
        </Link>
      </p>
    </div>
  );
}
