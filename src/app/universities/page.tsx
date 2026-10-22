import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Textbooks for Universities & Students — ANYFREEBOOK',
  description: 'Create a free ANYFREEBOOK institution for your school, university or library: invite members, assign reading plans, publish under your name and run live classes.',
  openGraph: {
    title: 'Free Textbooks for Universities & Students',
    description: 'Give your students free access to curated books and course materials — free to set up, no contracts.',
  },
};

/** What the institutions feature actually does (src/lib/institutions). */
const PARTNER_FEATURES = [
  { icon: '🏛️', title: 'Institution Profile', desc: 'Create a free profile for your school, university, library or NGO — name, logo, country and website.' },
  { icon: '👥', title: 'Members & Roles', desc: 'Invite staff and students with a link. Owners and admins manage the institution, teachers assign reading, students read.' },
  { icon: '📚', title: 'Reading List Templates', desc: 'Set a weekly book goal and a focus category once, then assign it to any student in one click.' },
  { icon: '✍️', title: 'Publish Under Your Name', desc: 'Post books, articles and notes on your institution’s page, so your cohort reads them in one place.' },
  { icon: '🎓', title: 'Live Classrooms', desc: 'Run a free video class with screen share and chat, and keep the replay for your students.' },
  { icon: '💬', title: 'Moderated Community', desc: 'Comment threads on your publications, with owner and admin tools to moderate them.' },
];

const GET_STARTED = [
  { n: '1', title: 'Create your institution', desc: 'Free, self-serve, and no contract — you own the account and the data.' },
  { n: '2', title: 'Invite your people', desc: 'Send an invite link to staff and students. Everyone joins with a role you choose.' },
  { n: '3', title: 'Assign reading', desc: 'Publish a reading-list template and push it to the students who need it.' },
];

const SUBJECTS = [
  { name: 'Computer Science', link: '/search?q=computer+science' },
  { name: 'Mathematics', link: '/search?q=mathematics+textbook' },
  { name: 'Physics', link: '/search?q=physics+textbook' },
  { name: 'Biology', link: '/search?q=biology+textbook' },
  { name: 'Chemistry', link: '/search?q=chemistry+textbook' },
  { name: 'Economics', link: '/search?q=economics+textbook' },
  { name: 'Psychology', link: '/search?q=psychology+textbook' },
  { name: 'Engineering', link: '/search?q=engineering+textbook' },
  { name: 'Medicine', link: '/search?q=medical+textbook' },
  { name: 'Law', link: '/search?q=law+textbook' },
  { name: 'Business', link: '/search?q=business+textbook' },
  { name: 'Literature', link: '/search?q=literature' },
];

export default function UniversitiesPage() {
  return (
    <div className="content-wrapper py-12">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
          <span className="text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wide">FOR UNIVERSITIES & PROFESSORS</span>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-[var(--text)] leading-tight">
          Your students shouldn&apos;t choose between{' '}
          <span className="gradient-text">textbooks and meals</span>
        </h1>
        <p className="mt-6 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
          ANYFREEBOOK gives every student free access to curated books, academic papers,
          and course materials from open-access repositories like Open Library, Project
          Gutenberg and the Internet Archive.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:partners@anyfreebook.com" className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            Partner With Us
          </a>
          <a href="/search" className="px-8 py-3.5 rounded-xl bg-[var(--surface)] text-[var(--text)] font-semibold border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all">
            Browse Free Textbooks
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {[
          { number: '240+', label: 'Curated free books' },
          { number: '7', label: 'Open-access sources searched live' },
          { number: '241', label: 'Subject categories to explore' },
          { number: '0', label: 'Cost to run an institution' },
        ].map(stat => (
          <div key={stat.label} className="text-center p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
            <p className="text-3xl font-bold gradient-text">{stat.number}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-bold text-[var(--text)] text-center mb-8">
          Built for academic institutions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PARTNER_FEATURES.map(f => (
            <div key={f.title} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:shadow-lg transition-shadow">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="text-sm font-bold text-[var(--text)] mt-3">{f.title}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subject areas */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-bold text-[var(--text)] text-center mb-2">
          Free textbooks by subject
        </h2>
        <p className="text-center text-[var(--text-muted)] mb-8">Click any subject to search free textbooks</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {SUBJECTS.map(s => (
            <a
              key={s.name}
              href={s.link}
              className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-md transition-all group"
            >
              <span className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)]">{s.name}</span>
              <span className="text-xs text-[var(--text-muted)] font-mono">Search →</span>
            </a>
          ))}
        </div>
      </div>

      {/* How to get started */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-bold text-[var(--text)] text-center mb-8">
          Set up in three steps
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {GET_STARTED.map(s => (
            <div key={s.n} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-bold flex items-center justify-center mb-3">
                {s.n}
              </div>
              <h3 className="text-sm font-bold text-[var(--text)]">{s.title}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <a href="/institutions/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--surface)] text-[var(--text)] text-sm font-semibold border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all">
            Create an institution →
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-12 px-8 rounded-2xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
          Ready to bring free reading to your students?
        </h2>
        <p className="opacity-90 max-w-lg mx-auto mb-6">
          Create an institution in minutes — free, no contracts. Or email us if you would
          rather talk it through first.
        </p>
        <a
          href="mailto:partners@anyfreebook.com"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[var(--primary)] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          Get Started — It&apos;s Free
        </a>
      </div>
    </div>
  );
}
