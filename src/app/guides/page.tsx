import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDES } from '@/lib/guides';
import { breadcrumbSchema } from '@/lib/schema';
import { cardClass, primaryButtonClass } from '@/lib/ui';

export const metadata: Metadata = {
  title:
    'Free Back to School Guides for Students, Lecturers and Researchers — ANYFREEBOOK',
  description:
    'Five free, detailed PDF guides for going back to school: a 30-day re-entry plan for returning students, a first-30-days plan for new students, a reading and writing plan for researchers, a first-week teaching plan for lecturers, and a guide to free textbooks and open courseware. Download any of them free.',
  keywords: [
    'back to school guide',
    'back to school encouragement strategies',
    'first day at university tips',
    'study plan for returning students',
    'fresher guide',
    'lecturer teaching plan',
    'research reading strategy',
    'free textbooks',
    'open courseware',
    'study plans pdf',
  ],
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Free Back to School Guides — ANYFREEBOOK',
    description:
      'Five detailed PDF guides for students, lecturers and researchers who are going back to school. Free to download, written to be used.',
  },
};

export default function GuidesIndexPage() {
  const schema = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/guides' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="content-wrapper py-10">
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)] mb-3">
            Free PDF guides
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] mb-4">
            Going back to school? Start here.
          </h1>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
            Five guides, each twenty pages or more, written for the people who actually have to
            do this: students returning after a break, students in their first year, researchers
            who have to find a direction in a literature they cannot read, and lecturers who
            have to reopen a course to a class that is also nervous. Every one is free to
            download, print and share.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Every resource mentioned in them is free and open — open textbooks, open courseware,
            public-domain books and open-access papers. The guides were written around what is
            actually free to read, because that is the part that is hard to find out.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
          {GUIDES.map(guide => (
            <article
              key={guide.slug}
              className={`${cardClass({ padding: 'p-6' })} flex flex-col`}
              style={{ borderTop: `3px solid ${guide.accent}` }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: guide.accent }}>
                {guide.audience}
              </div>
              <h2 className="text-xl font-display font-bold text-[var(--text)] mb-2 leading-snug">
                <Link href={`/guides/${guide.slug}`} className="hover:underline">
                  {guide.title}
                </Link>
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-4 flex-1">
                {guide.description}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/guides/${guide.slug}`}
                  className={`${primaryButtonClass('sm')} no-underline`}
                >
                  Read and download
                </Link>
                <span className="text-xs text-[var(--text-muted)]">
                  {guide.sections.length} sections · PDF · free
                </span>
              </div>
            </article>
          ))}
        </div>

        <section className="max-w-3xl mt-14">
          <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">
            What is in them
          </h2>
          <div className="space-y-3 text-[var(--text-secondary)] leading-relaxed">
            <p>
              The <strong>back to school re-entry plan</strong> is for anyone who has been away
              from study for a while — a gap year, a pause, a career change, illness, money, or
              caring work. It is the one to read if the hardest part is starting again rather than
              the course itself.
            </p>
            <p>
              The <strong>first 30 days</strong> plan is for students in their first year. It
              covers what actually happens in week one, how to take notes you will still understand
              in March, and how to catch up when you fall behind without deciding to give up.
            </p>
            <p>
              The <strong>researcher’s restart</strong> is for new and early-career researchers:
              finding a direction, reading a literature that is too big, writing a first paper, and
              surviving a rejection.
            </p>
            <p>
              The <strong>lecturer’s re-entry plan</strong> is for teachers and tutors about to
              teach again — how to design a first week that does not humiliate anyone, how to
              design assessment students can actually use, and how to notice the student who is
              quietly drowning.
            </p>
            <p>
              The <strong>free resources guide</strong> is the reference: the twelve open
              libraries, free textbooks by subject, open courseware, open-access papers, and how to
              tell a real download from a catalogue record that only looks free.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
