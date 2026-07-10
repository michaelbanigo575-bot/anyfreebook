'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createFeedPost } from '@/lib/creators/feed';
import { uploadPublicationFile } from '@/lib/creators/client';

const CATEGORIES = ['General', 'Announcement', 'Technology', 'Education', 'Politics', 'Inspiration', 'Spiritual'];

export default function NewFeedPostPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [postType, setPostType] = useState<'article' | 'video' | 'file'>('article');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!loading && !user) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">✍️</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Sign in to post to the feed</h1>
        <a href="/login?redirect=/feed/new" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign In</a>
      </div>
    );
  }

  if (!loading && user && !profile?.is_creator) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🚀</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Become an author to post</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">The feed is for ANYFREEBOOK authors to share updates with their readers.</p>
        <a href="/creators/dashboard" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Get started</a>
      </div>
    );
  }

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    setUploading(true);
    const { error, url } = await uploadPublicationFile(f);
    setUploading(false);
    if (error) { setError(error); return; }
    if (url) setFileUrl(url);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError('Give your post a title.'); return; }
    if (postType === 'article' && !body.trim()) { setError('Write something for your article.'); return; }
    if (postType === 'video' && !videoUrl.trim()) { setError('Paste a video link.'); return; }
    if (postType === 'file' && !fileUrl.trim()) { setError('Upload or link a file.'); return; }

    setSaving(true);
    const { error, id } = await createFeedPost({ postType, title, body, videoUrl, fileUrl, coverUrl, category });
    setSaving(false);
    if (error) { setError(error); return; }
    router.push('/feed');
    router.refresh();
    void id;
  };

  return (
    <div className="content-wrapper py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-[var(--text)] mb-6">New feed post</h1>

      <div className="flex gap-2 mb-5">
        {(['article', 'video', 'file'] as const).map(t => (
          <button
            key={t}
            onClick={() => setPostType(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors ${postType === t ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
          >
            {t === 'article' ? '📝 Article' : t === 'video' ? '🎬 Video' : '📎 File'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] font-bold outline-none focus:border-[var(--primary)]"
        />

        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {postType === 'article' && (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What's happening?"
            rows={8}
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
          />
        )}

        {postType === 'video' && (
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="YouTube or video link"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
          />
        )}

        {postType === 'file' && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/50 p-4">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-60">
              {uploading ? 'Uploading…' : fileUrl ? '✓ Uploaded — replace' : '📎 Upload PDF / Word doc'}
            </button>
            <input
              value={fileUrl}
              onChange={e => setFileUrl(e.target.value)}
              placeholder="…or paste a file link"
              className="mt-3 w-full px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]"
            />
          </div>
        )}

        <input
          value={coverUrl}
          onChange={e => setCoverUrl(e.target.value)}
          placeholder="Cover image URL (optional)"
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]"
        />

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
        >
          {saving ? 'Posting…' : 'Post to feed'}
        </button>
      </div>
    </div>
  );
}
