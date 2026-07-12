'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * A unified, upgraded activity history: classes the user attended (with the
 * exact date & time) merged with their book activity, grouped by day into a
 * visual timeline. Reads only RLS-readable sources (classroom_attendance,
 * book_interactions) so it works for any signed-in user.
 */

interface ActivityItem {
  id: string;
  kind: 'class' | 'liked' | 'wishlisted' | 'favorited';
  title: string;
  subtitle?: string;
  href?: string;
  at: string; // ISO timestamp
}

const META: Record<ActivityItem['kind'], { icon: string; verb: string; tint: string }> = {
  class:      { icon: '🎓', verb: 'Attended class',   tint: 'from-red-500/15 to-rose-500/15 text-red-500' },
  liked:      { icon: '❤️', verb: 'Liked',            tint: 'from-pink-500/15 to-rose-500/15 text-pink-500' },
  wishlisted: { icon: '📚', verb: 'Added to wishlist', tint: 'from-blue-500/15 to-cyan-500/15 text-blue-500' },
  favorited:  { icon: '⭐', verb: 'Favorited',        tint: 'from-amber-500/15 to-yellow-500/15 text-amber-500' },
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function ActivityTimeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const [att, inter] = await Promise.all([
        sb.from('classroom_attendance')
          .select('id, joined_at, classroom:classrooms(title, room_code, status)')
          .eq('user_id', userId)
          .order('joined_at', { ascending: false })
          .limit(100),
        sb.from('book_interactions')
          .select('id, action, book_title, book_author, book_slug, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      const merged: ActivityItem[] = [];

      for (const a of (att.data as unknown as {
        id: string; joined_at: string; classroom: { title: string; room_code: string; status: string } | null;
      }[]) || []) {
        if (!a.classroom) continue;
        merged.push({
          id: `class-${a.id}`,
          kind: 'class',
          title: a.classroom.title,
          subtitle: a.classroom.status === 'ended' ? 'Class replay available' : 'Live classroom',
          href: `/class/${a.classroom.room_code}`,
          at: a.joined_at,
        });
      }

      for (const b of (inter.data as {
        id: string; action: string; book_title: string | null; book_author: string | null; book_slug: string | null; created_at: string;
      }[]) || []) {
        if (!['liked', 'wishlisted', 'favorited'].includes(b.action)) continue;
        merged.push({
          id: `book-${b.id}`,
          kind: b.action as ActivityItem['kind'],
          title: b.book_title || 'Untitled',
          subtitle: b.book_author || undefined,
          href: b.book_slug ? `/book/${b.book_slug}` : undefined,
          at: b.created_at,
        });
      }

      merged.sort((x, y) => +new Date(y.at) - +new Date(x.at));
      setItems(merged);
    })();
  }, [userId]);

  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-muted)] text-sm">
        <span className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin" />
        Loading your activity…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🕓</p>
        <p className="text-lg font-medium text-[var(--text-secondary)]">No activity yet</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">Attend a class or explore books — your history builds here.</p>
        <div className="flex gap-2 justify-center mt-4">
          <a href="/classrooms" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold shadow-md">Browse classes</a>
          <a href="/explore" className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--surface-hover)]">Explore books</a>
        </div>
      </div>
    );
  }

  // Group consecutive items by day label
  const groups: { day: string; rows: ActivityItem[] }[] = [];
  for (const it of items) {
    const day = dayLabel(it.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(it);
    else groups.push({ day, rows: [it] });
  }

  const classesAttended = items.filter(i => i.kind === 'class').length;

  return (
    <div>
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Classes attended', value: classesAttended, icon: '🎓' },
          { label: 'Books liked', value: items.filter(i => i.kind === 'liked').length, icon: '❤️' },
          { label: 'Wishlisted', value: items.filter(i => i.kind === 'wishlisted').length, icon: '📚' },
          { label: 'Favorites', value: items.filter(i => i.kind === 'favorited').length, icon: '⭐' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
            <span className="text-xl block">{s.icon}</span>
            <p className="text-xl font-bold text-[var(--text)]">{s.value}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.day + group.rows[0].id}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{group.day}</h3>
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            </div>
            <ol className="relative border-l-2 border-[var(--border-subtle)] ml-3 space-y-3">
              {group.rows.map(it => {
                const m = META[it.kind];
                const Row = (
                  <div className="flex items-start gap-3 group">
                    <span className={`absolute -left-[15px] w-7 h-7 rounded-full bg-gradient-to-br ${m.tint} border-2 border-[var(--bg)] flex items-center justify-center text-xs`}>
                      {m.icon}
                    </span>
                    <div className="ml-6 flex-1 min-w-0 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)] transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{m.verb}</p>
                        <time className="text-[11px] text-[var(--text-muted)] flex-shrink-0">{timeLabel(it.at)}</time>
                      </div>
                      <p className="text-sm font-semibold text-[var(--text)] truncate mt-0.5">{it.title}</p>
                      {it.subtitle && <p className="text-xs text-[var(--text-muted)] truncate">{it.subtitle}</p>}
                    </div>
                  </div>
                );
                return (
                  <li key={it.id}>
                    {it.href ? <a href={it.href} className="block">{Row}</a> : Row}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
