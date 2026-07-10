'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { listChapters, createChapter, updateChapter, deleteChapter, type Chapter } from '@/lib/creators/client';

export function ChaptersManager({ publicationId, slug }: { publicationId: string; slug: string }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setChapters(await listChapters(publicationId));
    setLoading(false);
  }, [publicationId]);

  useEffect(() => { reload(); }, [reload]);

  const add = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) { setError('Chapter needs a title.'); return; }
    if (!body.trim()) { setError('Chapter needs content.'); return; }
    setSaving(true);
    const { error } = await createChapter(publicationId, title, body, publish);
    setSaving(false);
    if (error) { setError(error); return; }
    setTitle(''); setBody('');
    reload();
  };

  const toggle = async (c: Chapter) => {
    setBusy(c.id);
    await updateChapter(c.id, { status: c.status === 'published' ? 'draft' : 'published' });
    setBusy(null);
    reload();
  };

  const remove = async (c: Chapter) => {
    if (!confirm(`Delete chapter "${c.title}"?`)) return;
    setBusy(c.id);
    await deleteChapter(c.id);
    setBusy(null);
    reload();
  };

  const move = async (c: Chapter, dir: -1 | 1) => {
    const idx = chapters.findIndex(x => x.id === c.id);
    const other = chapters[idx + dir];
    if (!other) return;
    setBusy(c.id);
    await Promise.all([
      updateChapter(c.id, { position: other.position }),
      updateChapter(other.id, { position: c.position }),
    ]);
    setBusy(null);
    reload();
  };

  return (
    <div className="space-y-8">
      {/* Existing chapters */}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading chapters…</p>
      ) : chapters.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No chapters yet — add the first one below.</p>
      ) : (
        <div className="space-y-2">
          {chapters.map((c, i) => (
            <div key={c.id} className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-3.5 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)] flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)] truncate">{c.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${c.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{c.status}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">{(c.body || '').trim().split(/\s+/).length.toLocaleString()} words</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => move(c, -1)} disabled={i === 0 || busy === c.id} className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 hover:bg-[var(--surface-hover)]" title="Move up">↑</button>
                <button onClick={() => move(c, 1)} disabled={i === chapters.length - 1 || busy === c.id} className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 hover:bg-[var(--surface-hover)]" title="Move down">↓</button>
                <button onClick={() => toggle(c)} disabled={busy === c.id} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50">
                  {c.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => remove(c)} disabled={busy === c.id} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add chapter */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-5 space-y-3">
        <h2 className="font-bold text-[var(--text)]">Add chapter {chapters.length + 1}</h2>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={`Chapter ${chapters.length + 1} title`}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Chapter content. Supports # headings, **bold**, - lists."
          rows={10}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] font-mono leading-relaxed"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => add(true)} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Publish chapter'}
          </button>
          <button onClick={() => add(false)} disabled={saving} className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-sm font-medium disabled:opacity-60">
            Save as draft
          </button>
        </div>
      </div>

      <div className="text-center">
        <Link href={`/read/${slug}`} className="text-sm text-[var(--primary)] hover:underline">View live publication →</Link>
        <span className="mx-2 text-[var(--text-muted)]">·</span>
        <Link href="/creators/dashboard" className="text-sm text-[var(--primary)] hover:underline">Back to dashboard</Link>
      </div>
    </div>
  );
}
