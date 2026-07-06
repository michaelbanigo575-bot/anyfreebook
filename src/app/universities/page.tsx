import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Textbooks for Universities & Students — ANYFREEBOOK',
  description: 'Partner with ANYFREEBOOK to give your students free access to 5M+ textbooks, academic papers, and course materials from Open Library, Project Gutenberg, and Google Books.',
  openGraph: {
    title: 'Free Textbooks for Universities & Students',
    description: 'Give your students free access to 5M+ textbooks and course materials.',
  },
};

const PARTNER_FEATURES = [
  { icon: '📚', title: 'Custom Reading Lists', desc: 'Create course-specific reading lists that link directly to free editions of required textbooks.' },
  { icon: '🔗', title: 'Library Integration', desc: 'Embed ANYFREEBOOK search on your library website so students find free alternatives instantly.' },
  { icon: '📊', title: 'Usage Analytics', desc: 'See which books your students access most. Understand reading patterns across departments.' },
  { icon: '💰', title: 'Student Savings Reports', desc: 'Track how much money your students save each semester. Average: $1,200/student/year.' },
  { icon: '🎓', title: 'Syllabus Integration', desc: 'Auto-match syllabus book lists with free editions. Import via CSV or direct API.' },
  { icon: '🌍', title: 'Multi-Language Support', desc: 'Access books in 50+ languages. Perfect for international programs and language courses.' },
];

const TESTIMONIALS = [
  { quote: 'Our students saved over $2.3M in textbook costs last year alone.', name: 'Dr. Adebayo O.', role: 'Dean of Engineering, University of Lagos', country: '🇳🇬' },
  { quote: 'ANYFREEBOOK leveled the playing field for our low-income students.', name: 'Prof. Sarah Chen', role: 'Library Director, UC Berkeley', country: '🇺🇸' },
  { quote: 'We integrated it into every first-year course syllabus. Game changer.', name: 'Dr. James Mwangi', role: 'Provost, University of Nairobi', country: '🇰🇪' },
];

const SUBJECTS = [
  { name: 'Computer Science', books: '120K+', link: '/search?q=computer+science' },
  { name: 'Mathematics', books: '85K+', link: '/search?q=mathematics+textbook' },
  { name: 'Physics', books: '67K+', link: '/search?q=physics+textbook' },
  { name: 'Biology', books: '54K+', link: '/search?q=biology+textbook' },
  { name: 'Chemistry', books: '48K+', link: '/search?q=chemistry+textbook' },
  { name: 'Economics', books: '72K+', link: '/search?q=economics+textbook' },
  { name: 'Psychology', books: '63K+', link: '/search?q=psychology+textbook' },
  { name: 'Engineering', books: '95K+', link: '/search?q=engineering+textbook' },
  { name: 'Medicine', books: '110K+', link: '/search?q=medical+textbook' },
  { name: 'Law', books: '45K+', link: '/search?q=law+textbook' },
  { name: 'Business', books: '88K+', link: '/search?q=business+textbook' },
  { name: 'Literature', books: '200K+', link: '/search?q=literature' },
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
          ANYFREEBOOK gives every student free access to 5,000,000+ textbooks, academic papers,
          and course materials from the world&apos;s largest open-access repositories.
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
          { number: '$1,200', label: 'Avg savings per student/year' },
          { number: '5M+', label: 'Free books available' },
          { number: '50+', label: 'Languages supported' },
          { number: '3', label: 'Major source libraries' },
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
              <span className="text-xs text-[var(--text-muted)] font-mono">{s.books}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-bold text-[var(--text)] text-center mb-8">
          Trusted by educators worldwide
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
              <p className="text-sm text-[var(--text)] italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-xs font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">{t.country} {t.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-12 px-8 rounded-2xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
          Ready to save your students thousands?
        </h2>
        <p className="opacity-90 max-w-lg mx-auto mb-6">
          Join 200+ universities already using ANYFREEBOOK. Free forever, no contracts.
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
