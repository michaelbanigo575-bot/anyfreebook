'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { fetchComments, postComment, deleteComment, type Comment } from '@/lib/creators/social';

function relTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function CommentsSection({ publicationId }: { publicationId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchComments(publicationId).then(c => { setComments(c); setLoading(false); });
  }, [publicationId]);

  const submit = async () => {
    if (!user) { router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    if (!text.trim() || posting) return;
    setPosting(true);
    const { error, comment } = await postComment(publicationId, text);
    setPosting(false);
    if (!error && comment) {
      setComments(c => [comment, ...c]);
      setText('');
    }
  };

  const remove = async (id: string) => {
    await deleteComment(id);
    setComments(c => c.filter(x => x.id !== id));
  };

  return (
    <section id="comments" className="mt-12 scroll-mt-20">
      <h2 className="text-lg font-bold text-[var(--text)] mb-4">
        Comments {comments.length > 0 && <span className="text-[var(--text-muted)] font-normal">({comments.length})</span>}
      </h2>

      {/* Composer */}
      <div className="flex gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(user?.email || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={user ? 'Share your thoughts…' : 'Sign in to comment'}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={submit}
              disabled={posting || !text.trim()}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {posting ? 'Posting…' : user ? 'Comment' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No comments yet. Be the first to respond.</p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] text-sm font-bold flex-shrink-0">
                {c.authorName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{c.authorName}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{relTime(c.created_at)}</span>
                  {user?.id === c.user_id && (
                    <button onClick={() => remove(c.id)} className="text-[11px] text-red-500 hover:underline ml-auto">Delete</button>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5 whitespace-pre-line">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
