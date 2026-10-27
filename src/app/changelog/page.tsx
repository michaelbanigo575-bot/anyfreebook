import type { Metadata } from 'next';
import Link from 'next/link';
import { CHANGELOG } from '@/lib/changelog';
import { breadcrumbSchema } from '@/lib/schema';
import { cardClass } from '@/lib/ui';

export const metadata: Metadata = {
  title: "What's New — ANYFREEBOOK Changelog",
  description:
    'Every shipped change to ANYFREEBOOK, in order: the search sources, the public API, the npm client, classroom history, publisher cover images, book downloads and the Android app.',
  openGraph: {
    title: "What's New — ANYFREEBOOK Changelog",
    description: 'What shipped, and when. The search sources, the API, the classroom history, the downloads and the app.',
  },
  alternates: { canonical: '/changelog' },
};

export default function ChangelogPage() {
  const schema = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'What’s new', path: '/changelog' },
  ]);

  const grouped = CHANGELOG.map(entry => ({
    ...entry,
    prettyDate: new Date(`${entry.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="content-wrapper py-8 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-4">
          What&rsquo;s new
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-10">
          Every change that reached production, newest first. Dates are the day the change went
          live, not the day it was written. The full list of open sources is on the{' '}
          <Link href="/sources" className="text-[var(--primary)] hover:underline">
            sources page
          </Link>
          , and the API is documented on{' '}
          <Link href="/developers" className="text-[var(--primary)] hover:underline">
            the developers page
          </Link>
          .
        </p>

        <div className="space-y-8">
          {grouped.map(entry => (
            <article key={`${entry.date}-${entry.title}`} className={cardClass({ hover: false })}>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <time
                  dateTime={entry.date}
                  className="text-sm font-medium text-[var(--text-muted)]"
                >
                  {entry.prettyDate}
                </time>
                {entry.area && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    {entry.area}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">
                {entry.title}
              </h2>

              <ul className="space-y-2">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex gap-3 text-[var(--text-secondary)] leading-relaxed">
                    <span aria-hidden="true" className="text-[var(--primary)] mt-1">
                      &bull;
                    </span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
