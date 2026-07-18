import type { Metadata } from 'next';
import { siteFaqSchema, breadcrumbSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — ANYFREEBOOK',
  description: 'How ANYFREEBOOK works: free books, the 40% author payout program, live classrooms, translation, and how content is sourced legally.',
  openGraph: {
    title: 'Frequently Asked Questions — ANYFREEBOOK',
    description: 'How ANYFREEBOOK works: free books, the 40% author payout program, live classrooms, and more.',
  },
};

const QA = [
  {
    q: 'Is ANYFREEBOOK really free?',
    a: 'Yes. Reading, downloading, listening to audiobooks, and watching live classrooms are all free with no paywall, no "sign up to download" gate, and no subscription tier. ANYFREEBOOK is funded by advertising, a share of which is paid out to publishing creators.',
  },
  {
    q: 'Where do the books come from — is this legal?',
    a: 'Every aggregated book comes from a verified open-access source: public-domain works, Creative Commons publications, government repositories, and open academic libraries such as Project Gutenberg, Open Library, Internet Archive, OpenStax, and MIT OpenCourseWare. Original works published directly on ANYFREEBOOK are submitted by their own authors.',
  },
  {
    q: 'How does the 40% author payout work?',
    a: "Authors who publish original work on ANYFREEBOOK (books, articles, poetry, course notes) earn a share of platform ad revenue based on verified reading engagement — how much people actually read their work, not just clicks. There's no submission fee and no exclusivity requirement.",
  },
  {
    q: 'Do I need an account to read a book or join a live class?',
    a: 'No. Anyone can read books and watch live classrooms without creating an account. An account is only needed to publish your own work, comment, follow authors, or keep a personal reading history.',
  },
  {
    q: 'How do live classrooms work?',
    a: "Any creator can host a free live class with video, live chat, and document/screen sharing directly in the browser — no software download required. Classes can be public (open to anyone) or private (invite-link only).",
  },
  {
    q: 'What languages does ANYFREEBOOK support?',
    a: 'The site can be translated on the fly into 30+ languages using the language switcher in the navigation bar. There are also dedicated categories for books originally written in specific languages (French, Swahili, Yoruba, Hindi, Arabic, and more) and for literature by country and continent.',
  },
  {
    q: 'How many books does ANYFREEBOOK have?',
    a: "ANYFREEBOOK aggregates 1.7 million+ free books, audiobooks, and textbooks across 234 categories spanning subjects, world literature by country/continent, and languages.",
  },
];

export default function FAQPage() {
  const schemas = [
    siteFaqSchema(QA),
    breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }]),
  ];

  return (
    <>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <div className="content-wrapper py-8 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-8">
          Frequently asked questions
        </h1>
        <div className="space-y-6">
          {QA.map(({ q, a }) => (
            <div key={q} className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
              <h2 className="text-lg font-display font-bold text-[var(--text)] mb-2">{q}</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
