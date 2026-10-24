import { requireAdmin } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import { listDrafts, listEvents, listTargets } from '@/lib/reddit/store';
import { MIN_VALUE_RATIO, MAX_SUBREDDITS_PER_DAY } from '@/lib/reddit/policy';
import { QueueClient } from './QueueClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Reddit Queue — ANYFREEBOOK',
  robots: { index: false, follow: false },
};

/**
 * The operator's Reddit queue.
 *
 * It shows what the system found and what it drafted. It does not post. The
 * only actions on this page are "copy this reply" and "I submitted it" — and
 * the second one is a note in our own database, not a call to Reddit.
 */
export default async function RedditQueuePage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/');

  const [targets, drafts, events] = await Promise.all([
    listTargets(),
    listDrafts(50),
    listEvents(20),
  ]);

  const pending = drafts.filter((d) => d.status === 'draft');
  const unverified = targets.filter((t) => !t.rulesVerifiedAt);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-[var(--text)]">Reddit queue</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
          Discovery and drafts only. Nothing on this page posts to Reddit — you read the draft,
          check the subreddit&rsquo;s rules, paste it in yourself, then mark it submitted so we do not
          answer the same thread twice.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Drafts waiting" value={String(pending.length)} sub="not yet reviewed" />
        <Stat
          label="Value ratio floor"
          value={`${MIN_VALUE_RATIO}:1`}
          sub="answer words : mention words"
        />
        <Stat
          label="Daily read cap"
          value={String(MAX_SUBREDDITS_PER_DAY)}
          sub="subreddits per day, across both products"
        />
        <Stat
          label="Rules unverified"
          value={String(unverified.length)}
          sub="targets nobody has re-checked"
          tone={unverified.length > 0 ? 'warn' : 'good'}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Drafts</h2>
        <QueueClient drafts={drafts} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Communities we watch</h2>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-[var(--text)]">Subreddit</th>
                <th className="px-4 py-2 font-medium text-[var(--text)]">Product</th>
                <th className="px-4 py-2 font-medium text-[var(--text)]">Links</th>
                <th className="px-4 py-2 font-medium text-[var(--text)]">Self-promo thread</th>
                <th className="px-4 py-2 font-medium text-[var(--text)]">Age / karma</th>
                <th className="px-4 py-2 font-medium text-[var(--text)]">Rules verified</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id} className="border-t border-[var(--border-subtle)] align-top">
                  <td className="px-4 py-2">
                    <a
                      href={`https://www.reddit.com/r/${t.subreddit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      r/{t.subreddit}
                    </a>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{t.purpose}</p>
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">{t.product}</td>
                  <td className="px-4 py-2">
                    {t.linksAllowed === null ? (
                      <span className="text-amber-600 dark:text-amber-400">unknown</span>
                    ) : t.linksAllowed ? (
                      'allowed'
                    ) : (
                      'not allowed'
                    )}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">
                    {t.selfPromoThread || <span className="text-[var(--text-muted)]">none known</span>}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">
                    {t.minAccountAgeDays !== null ? `${t.minAccountAgeDays}d` : '—'} /{' '}
                    {t.minKarma !== null ? t.minKarma : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {t.rulesVerifiedAt ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {new Date(t.rulesVerifiedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-3">Recent activity</h2>
        <div className="space-y-1 text-sm">
          {events.length === 0 && (
            <p className="text-[var(--text-muted)]">
              Nothing yet. Run <code className="font-mono">node scripts/reddit-discover.mjs</code> from a
              machine Reddit does not block.
            </p>
          )}
          {events.map((e, i) => (
            <p key={i} className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)] font-mono text-xs">{e.event_type}</span>{' '}
              {JSON.stringify(e.detail)}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = 'good',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-2xl font-bold text-[var(--text)] mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      {tone === 'warn' && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">needs attention</p>}
    </div>
  );
}
