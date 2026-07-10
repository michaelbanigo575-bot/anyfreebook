'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPublication, updatePublication, uploadPublicationFile } from '@/lib/creators/client';
import { PUBLICATION_TYPES, type Publication, type PublicationType, type OriginalityStatus } from '@/lib/creators/types';

const CATEGORIES = ['General', 'Technology', 'Business', 'Sciences', 'Medicine', 'Arts & Humanities', 'Education', 'Self-Help', 'Fiction', 'Poetry', 'Biography'];
const TYPES: { id: Publication['content_type']; label: string }[] = [
  { id: 'article', label: 'Article' },
  { id: 'book', label: 'Book / Long-form' },
  { id: 'story', label: 'Story' },
  { id: 'poetry', label: 'Poetry' },
  { id: 'guide', label: 'Guide' },
];

interface OriginalityMatch { source: string; title: string; author?: string; url: string }

export function PublishForm({ existing }: { existing?: Publication }) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title || '');
  const [subtitle, setSubtitle] = useState(existing?.subtitle || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [category, setCategory] = useState(existing?.category || 'General');
  const [contentType, setContentType] = useState<Publication['content_type']>(existing?.content_type || 'article');
  const [publicationType, setPublicationType] = useState<PublicationType>(existing?.publication_type || 'authored_work');
  const [body, setBody] = useState(existing?.body || '');
  const [coverUrl, setCoverUrl] = useState(existing?.cover_url || '');
  const [externalUrl, setExternalUrl] = useState(existing?.external_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Originality check
  const [checkingOriginality, setCheckingOriginality] = useState(false);
  const [originalityStatus, setOriginalityStatus] = useState<OriginalityStatus>(existing?.originality_status || 'unchecked');
  const [originalityMatches, setOriginalityMatches] = useState<OriginalityMatch[]>([]);
  const [confirmLicensed, setConfirmLicensed] = useState(false);

  const runOriginalityCheck = async () => {
    if (!title.trim()) { setError('Add a title before checking originality.'); return; }
    setError(null);
    setCheckingOriginality(true);
    try {
      const res = await fetch('/api/ai/originality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      setOriginalityStatus(data.status);
      setOriginalityMatches(data.matches || []);
    } catch {
      setError('Could not run the originality check — try again.');
    } finally {
      setCheckingOriginality(false);
    }
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    setUploading(true);
    const { error, url } = await uploadPublicationFile(f);
    setUploading(false);
    if (error) { setError(error); return; }
    if (url) setExternalUrl(url);
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  const needsLicenseConfirmation = publicationType === 'licensed_publication';
  const originalityBlocked = (originalityStatus === 'flagged' || needsLicenseConfirmation) && !confirmLicensed;

  const submit = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) { setError('Give your work a title.'); return; }
    if (!body.trim() && !externalUrl.trim()) { setError('Add some content, or link to an external file.'); return; }
    if (publish && originalityStatus === 'unchecked') {
      setError('Run the originality check before publishing (or save as a draft).');
      return;
    }
    if (publish && originalityBlocked) {
      setError('This looks like it may already be published elsewhere, or needs a license confirmation — check the box below to confirm you have the rights to publish it.');
      return;
    }
    setSaving(true);

    const finalOriginalityStatus: OriginalityStatus = confirmLicensed && originalityStatus === 'flagged'
      ? 'author_confirmed_licensed'
      : originalityStatus;

    if (existing) {
      const { error } = await updatePublication(existing.id, { title, subtitle, description, category, content_type: contentType, publication_type: publicationType, originality_status: finalOriginalityStatus, body, cover_url: coverUrl, external_url: externalUrl, publish });
      setSaving(false);
      if (error) { setError(error); return; }
      router.push('/creators/dashboard');
      router.refresh();
    } else {
      const { error, slug } = await createPublication({ title, subtitle, description, category, contentType, publicationType, originalityStatus: finalOriginalityStatus, body, coverUrl, externalUrl, publish });
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

      <div>
        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Publication type</label>
        <select
          value={publicationType}
          onChange={e => { setPublicationType(e.target.value as PublicationType); setConfirmLicensed(false); }}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
        >
          {PUBLICATION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">{PUBLICATION_TYPES.find(t => t.id === publicationType)?.hint}</p>
      </div>

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

      {/* File upload / link */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.epub,.doc,.docx,application/pdf,application/epub+zip,audio/mpeg,audio/mp4,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : '📎 Upload PDF / EPUB / Word / audio'}
          </button>
          <span className="text-xs text-[var(--text-muted)]">max 20 MB · stored securely, served free</span>
        </div>
        {externalUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ File attached:</span>
            <span className="text-[var(--text-muted)] font-mono truncate flex-1">{externalUrl.split('/').pop()}</span>
            <button type="button" onClick={() => setExternalUrl('')} className="text-red-500 hover:underline flex-shrink-0">Remove</button>
          </div>
        )}
        <input
          value={externalUrl}
          onChange={e => setExternalUrl(e.target.value)}
          placeholder="…or paste a link to an already-hosted file (optional)"
          className="mt-3 w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Originality check */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Originality check</h3>
            <p className="text-[11px] text-[var(--text-muted)]">We cross-check your title against major book catalogs before you publish.</p>
          </div>
          <button
            type="button"
            onClick={runOriginalityCheck}
            disabled={checkingOriginality}
            className="px-4 py-2 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {checkingOriginality ? 'Checking…' : originalityStatus === 'unchecked' ? 'Run check' : 'Re-check'}
          </button>
        </div>

        {originalityStatus === 'checked_clear' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ No matching published work found — clear to publish.</p>
        )}

        {originalityStatus === 'flagged' && (
          <div className="space-y-2">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              ⚠ A work with a similar title already exists in a major catalog:
            </p>
            <ul className="space-y-1">
              {originalityMatches.map((m, i) => (
                <li key={i} className="text-[11px] text-[var(--text-muted)]">
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{m.title}</a>
                  {m.author && ` by ${m.author}`} — {m.source}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(originalityStatus === 'flagged' || needsLicenseConfirmation) && (
          <label className="flex items-start gap-2 mt-3 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" checked={confirmLicensed} onChange={e => setConfirmLicensed(e.target.checked)} className="mt-0.5" />
            <span>
              I confirm I own the rights to publish this work, or I am legally licensed/authorized to publish it (e.g. as the original author, or with permission).
            </span>
          </label>
        )}
      </div>

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
