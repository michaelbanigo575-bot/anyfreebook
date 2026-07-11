import type { Metadata } from 'next';
import Link from 'next/link';
import { getUpcomingClassrooms, getPastClassrooms } from '@/lib/classrooms/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live Classrooms — Learn with ANYFREEBOOK Authors',
  description: 'Join free live classes hosted by authors and lecturers — live video, screen sharing and chat, straight from the books you read.',
};

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function ClassroomsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingClassrooms(20), getPastClassrooms(9)]);
  const live = upcoming.filter(c => c.status === 'live');
  const scheduled = upcoming.filter(c => c.status === 'scheduled');

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">🎓 Live Classrooms</h1>
          <p className="text-[var(--text-muted)] mt-1">Free live classes from authors and lecturers — video, screen share, and chat.</p>
        </div>
        <Link href="/classrooms/new" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all">
          + Host a class
        </Link>
      </div>

      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-3">● Live now</h2>
          <div className="space-y-3">
            {live.map(c => (
              <Link key={c.id} href={`/class/${c.room_code}`} className="block rounded-2xl border-2 border-red-500/40 bg-[var(--surface)] p-5 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--text)] truncate">{c.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {c.host?.display_name || 'Author'} · started {fmtWhen(c.started_at || c.scheduled_at)} · 👥 {c.peak_attendance}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">Join now →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Upcoming</h2>
        {scheduled.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-10 text-center">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-semibold text-[var(--text)]">No classes scheduled yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">Are you an author? Host the first live class on ANYFREEBOOK.</p>
            <Link href="/classrooms/new" className="inline-flex px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold">Host a class</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {scheduled.map(c => (
              <Link key={c.id} href={`/class/${c.room_code}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 hover:border-[var(--primary)] hover:shadow-md transition-all">
                <h3 className="font-bold text-[var(--text)] line-clamp-2">{c.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">{c.host?.display_name || 'Author'}</p>
                <p className="text-xs font-semibold text-[var(--primary)] mt-2">🗓 {fmtWhen(c.scheduled_at)} · {c.duration_min} min</p>
                {c.publication && <p className="text-[11px] text-[var(--text-muted)] mt-1">📖 {c.publication.title}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Replays</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {past.map(c => (
              <Link key={c.id} href={`/class/${c.room_code}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 hover:border-[var(--primary)] transition-all">
                <p className="text-2xl mb-2">🎬</p>
                <h3 className="text-sm font-bold text-[var(--text)] line-clamp-2">{c.title}</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{c.host?.display_name || 'Author'} · 👥 {c.peak_attendance}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
