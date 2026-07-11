'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClassroom } from '@/lib/classrooms/client';
import { createClient } from '@/lib/supabase/client';

interface PubOption { id: string; title: string }

export default function NewClassroomPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(60);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [publicationId, setPublicationId] = useState('');
  const [pubs, setPubs] = useState<PubOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ roomCode: string; inviteToken: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    createClient().from('publications').select('id, title').eq('author_id', user.id).eq('status', 'published')
      .then(({ data }) => setPubs((data as PubOption[]) || []));
  }, [user]);

  if (!loading && !user) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🎓</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Sign in to host a class</h1>
        <a href="/login?redirect=/classrooms/new" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign In</a>
      </div>
    );
  }

  if (!loading && user && !profile?.is_creator) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🚀</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Classrooms are for authors</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Create your free author account first, then host live classes for your readers.</p>
        <a href="/creators/dashboard" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Become an author</a>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError('Give your class a title.'); return; }
    if (!when) { setError('Pick a date and time.'); return; }
    const scheduledAt = new Date(when);
    if (isNaN(scheduledAt.getTime())) { setError('That date looks invalid.'); return; }

    setSaving(true);
    const { error, roomCode, inviteToken } = await createClassroom({
      title, description, scheduledAt: scheduledAt.toISOString(),
      durationMin: duration, visibility, publicationId: publicationId || null,
    });
    setSaving(false);
    if (error) { setError(error); return; }
    setCreated({ roomCode: roomCode!, inviteToken: inviteToken ?? null });
  };

  if (created) {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://anyfreebook.com';
    const link = `${base}/class/${created.roomCode}${created.inviteToken ? `?t=${created.inviteToken}` : ''}`;
    return (
      <div className="content-wrapper py-16 max-w-lg mx-auto text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h1 className="text-2xl font-display font-bold text-[var(--text)] mb-2">Class scheduled!</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Share this link with your students{visibility === 'private' ? ' — it contains the private invite token' : ''}:
        </p>
        <div className="flex items-center gap-2 mb-6">
          <code className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text)] break-all text-left">{link}</code>
          <button
            onClick={() => navigator.clipboard.writeText(link)}
            className="px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold flex-shrink-0"
          >
            Copy
          </button>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push(`/class/${created.roomCode}${created.inviteToken ? `?t=${created.inviteToken}` : ''}`)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">
            Go to classroom
          </button>
          <button onClick={() => router.push('/classrooms')} className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)]">
            All classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper py-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-[var(--text)] mb-1">🎓 Host a live class</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Teach from your published work — live video, screen sharing, and chat, right on ANYFREEBOOK.</p>

      <div className="space-y-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Class title (e.g. 'Chapter 3 walkthrough: Thermodynamics')"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] font-semibold outline-none focus:border-[var(--primary)]"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What will you cover? (optional)"
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] resize-none"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Date & time</label>
            <input
              type="datetime-local"
              value={when}
              onChange={e => setWhen(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Duration</label>
            <select value={duration} onChange={e => setDuration(+e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]">
              {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Linked publication (optional)</label>
          <select value={publicationId} onChange={e => setPublicationId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]">
            <option value="">None — standalone class</option>
            {pubs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Students get a link to read along while you teach.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Who can join</label>
          <div className="flex gap-2">
            <button onClick={() => setVisibility('public')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${visibility === 'public' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              🌍 Public — anyone
            </button>
            <button onClick={() => setVisibility('private')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${visibility === 'private' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              🔒 Private — invite link only
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={submit} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60">
          {saving ? 'Scheduling…' : 'Schedule class'}
        </button>

        <p className="text-[11px] text-[var(--text-muted)] text-center">
          Video runs on Jitsi Meet (free, open-source). When you start the class, Jitsi may ask the first person in the room to sign in with Google/GitHub — that&apos;s you, the host, one time.
        </p>
      </div>
    </div>
  );
}
