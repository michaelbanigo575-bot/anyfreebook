'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPublication, updatePublication } from '@/lib/creators/client';
import type { Publication } from '@/lib/creators/types';

const CATEGORIES = ['General', 'Technology', 'Business', 'Sciences', 'Medicine', 'Arts & Humanities', 'Education', 'Self-Help', 'Fiction', 'Poetry', 'Biography'];
const TYPES: { id: Publication['content_type']; label: string }[] = [
  { id: 'article', label: 'Article' },
  { id: 'book', label: 'Book / Long-form' },
  { id: 'story', label: 'Story' },
  { id: 'poetry', label: 'Poetry' },
  { id: 'guide', label: 'Guide' },
];

export function PublishForm({ existing }: { existing?: Publication }) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title || '');
  const [subtitle, setSubtitle] = useState(existing?.subtitle || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [category, setCategory] = useState(existing?.category || 'General');
  const [contentType, setContentType] = useState<Publication['content_type']>(existing?.content_type || 'article');
  const [body, setBody] = useState(existing?.body || '');
  const [coverUrl, setCoverUrl] = useState(existing?.cover_url || '');
  const [externalUrl, setExternalUrl] = useState(existing?.external_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  const submit = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) { setError('Give your work a title.'); return; }
    if (!body.trim() && !externalUrl.trim()) { setError('Add some content, or link to an external file.'); return; }
    setSaving(true);

    if (existing) {
      const { error } = await updatePublication(existing.id, { title, subtitle, description, category, content_type: contentType, body, cover_url: coverUrl, external_url: externalUrl, publish });
      setSaving(false);
      if (error) { setError(error); return; }
      router.push('/creators/dashboard');
      router.refresh();
    } else {
      const { error, slug } = await createPublication({ title, subtitle, description, category, contentType, body, coverUrl, externalUrl, publish });
      setSaving(false);
      if (error) { setError(error); return; }
      if (publish && slug) { router.push(`/read/${slug}`); } else { router.push('/creators/dashboard'); }
      router.refresh();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xl font-bold outline-none focus:border-[var(--primary)]"
      />
      <input
        value={subtitle}
        onChange={e => setSubtitle(e.target.value)}
        placeholder="Subtitle (optional)"
        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <select value={contentType} onChange={e => setContentType(e.target.value as Publication['content_type'])} className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]">
          {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <input
        value={coverUrl}
        onChange={e => setCoverUrl(e.target.value)}
        placeholder="Cover image URL (optional)"
        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
      />

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Short description shown in listings (optional)"
        rows={2}
        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] resize-none"
      />

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Content</label>
          <span className="text-xs text-[var(--text-muted)]">{wordCount.toLocaleString()} words · supports **bold**, # headings, - lists</span>
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your work here. Use # for headings, ** for bold, - for lists. For a full book you can paste chapter by chapter, or link an external file below."
          rows={16}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] font-mono leading-relaxed"
        />
      </div>

      <input
        value={externalUrl}
        onChange={e => setExternalUrl(e.target.value)}
        placeholder="Or link to a hosted PDF/EPUB (optional)"
        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
      />

      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => submit(true)}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
        >
          {saving ? 'Saving…' : existing?.status === 'published' ? 'Update & keep published' : 'Publish now'}
        </button>
        <button
          onClick={() => submit(false)}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text)] font-medium border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-60"
        >
          Save draft
        </button>
      </div>
    </div>
  );
}
