import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free WAEC & JAMB Past Questions — Study Resources',
  description: 'Free, legitimate resources for WAEC and JAMB past questions, syllabi, and exam prep — curated links to official and trusted Nigerian exam-prep sources.',
};

const RESOURCES = [
  {
    title: 'WAEC e-Learning Portal',
    org: 'West African Examinations Council',
    desc: 'The official WAEC platform with past questions, syllabus documents, and study guides for all subjects.',
    url: 'https://www.waeconline.org.ng',
    official: true,
  },
  {
    title: 'JAMB CBT Practice & Syllabus',
    org: 'Joint Admissions and Matriculation Board',
    desc: 'JAMB\'s official UTME syllabus and CBT practice software for exam preparation.',
    url: 'https://www.jamb.gov.ng',
    official: true,
  },
  {
    title: 'MySchool.ng',
    org: 'Independent exam-prep platform',
    desc: 'Free and paid WAEC, NECO, JAMB past questions with answers, widely used across Nigeria.',
    url: 'https://myschool.ng',
    official: false,
  },
  {
    title: 'Larnedu',
    org: 'Independent exam-prep platform',
    desc: 'Free downloadable WAEC and JAMB past question PDFs, organized by subject and year.',
    url: 'https://www.larnedu.com',
    official: false,
  },
  {
    title: 'PastQuestions.com.ng',
    org: 'Independent exam-prep platform',
    desc: 'Archive of past WAEC, JAMB, NECO, and Post-UTME questions across subjects.',
    url: 'https://pastquestions.com.ng',
    official: false,
  },
  {
    title: 'NECO e-Registration Portal',
    org: 'National Examinations Council',
    desc: 'Official NECO resources, timetables and syllabus documents.',
    url: 'https://www.neco.gov.ng',
    official: true,
  },
];

export default function WaecJambPage() {
  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--text)]">Home</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">WAEC & JAMB Resources</span>
      </nav>

      <div className="rounded-2xl p-8 md:p-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-[var(--border-subtle)] mb-10">
        <span className="text-5xl mb-4 block">🎓</span>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
          Free WAEC & JAMB Past Questions
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl">
          Curated links to legitimate, trusted sources for WAEC, JAMB, and NECO past questions and study material.
        </p>
      </div>

      <div className="mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>A note on this page:</strong> unlike the rest of ANYFREEBOOK, these aren&apos;t live-aggregated search results —
          there&apos;s no public API for WAEC/JAMB past questions, so this is a hand-picked list of real, working, trustworthy sources.
          We link out; we don&apos;t host or claim to own this content.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {RESOURCES.map(r => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg transition-all p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-bold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">{r.title}</h2>
              {r.official && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold uppercase">Official</span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-2">{r.org}</p>
            <p className="text-sm text-[var(--text-secondary)]">{r.desc}</p>
            <span className="inline-block mt-3 text-xs font-semibold text-[var(--primary)]">Visit site →</span>
          </a>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">Looking for textbooks instead of past questions?</p>
        <Link href="/search?q=WAEC+syllabus" className="text-sm font-semibold text-[var(--primary)] hover:underline">
          Search our aggregated library →
        </Link>
      </div>
    </div>
  );
}
