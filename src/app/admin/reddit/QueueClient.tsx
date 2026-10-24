'use client';

import { useState } from 'react';
import type { RedditDraft } from '@/lib/reddit/types';
import { MIN_VALUE_RATIO } from '@/lib/reddit/policy';

/**
 * The draft queue.
 *
 * The two buttons do different things on purpose. "Copy reply" is how you get
 * the text — nothing is sent anywhere. "I posted this" records in our own
 * database that a human already replied, so the same thread does not come
 * back tomorrow. Neither button talks to Reddit.
 */
export function QueueClient({ drafts }: { drafts: RedditDraft[] }) {
  const [items, setItems] = useState(drafts);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(draft: RedditDraft) {
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopied(draft.id || draft.subreddit);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
      alert('Could not reach the clipboard. Select the text and copy it manually.');
    }
  }

  async function mark(draftId: string, action: 'submitted' | 'discarded') {
    if (!draftId) return;
    setBusy(draftId);
    try {
      const res = await fetch(`/api/reddit/drafts/${draftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((d) =>
          d.id === draftId
            ? { ...d, status: action === 'submitted' ? 'submitted' : 'discarded' }
            : d
        )
      );
    } catch (err) {
      alert(`Could not update the draft: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] p-6">
        No drafts yet. Run the discovery script from a machine Reddit does not block, then draft
        against the threads it finds.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((draft) => {
        const ready = draft.valueRatio >= MIN_VALUE_RATIO;
        const isDone = draft.status === 'submitted' || draft.status === 'discarded';

        return (
          <article
            key={draft.id}
            className={`rounded-[var(--radius-lg)] border p-5 ${
              isDone
                ? 'border-[var(--border-subtle)] opacity-60'
                : 'border-[var(--border-subtle)] bg-[var(--surface)]'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="font-mono text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                r/{draft.subreddit}
              </span>
              <span className="text-xs text-[var(--text-muted)]">{draft.product}</span>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  ready
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-500/10'
                }`}
              >
                {draft.valueRatio}:1 value ratio
              </span>
              {draft.linkedArticleSlug && (
                <a
                  href={draft.linkedArticleUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  links an article
                </a>
              )}
              {draft.status !== 'draft' && (
                <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  {draft.status}
                </span>
              )}
            </div>

            <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-sans leading-relaxed bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-subtle)]">
              {draft.body}
            </pre>

            {draft.ruleChecks.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-[var(--text-muted)] cursor-pointer">
                  {draft.ruleChecks.length} checks before you post
                </summary>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {draft.ruleChecks.map((check, i) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)]">
                      {check}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {!isDone && (
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => copy(draft)}
                  className="px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {copied === (draft.id || draft.subreddit) ? 'Copied' : 'Copy reply'}
                </button>
                <button
                  type="button"
                  disabled={busy === draft.id}
                  onClick={() => mark(draft.id || '', 'submitted')}
                  className="px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] disabled:opacity-50 transition-colors"
                >
                  I posted this
                </button>
                <button
                  type="button"
                  disabled={busy === draft.id}
                  onClick={() => mark(draft.id || '', 'discarded')}
                  className="px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-muted)] hover:border-[var(--danger, #dc2626)] disabled:opacity-50 transition-colors"
                >
                  Discard
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
