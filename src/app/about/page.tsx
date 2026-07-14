import type { Metadata } from 'next';
import { StatBlock } from '@/components/StatBlock';

export const metadata: Metadata = {
  title: 'About ANYFREEBOOK — Our Mission',
  description: 'ANYFREEBOOK is the world\'s largest free book aggregator. Learn about our mission to make knowledge accessible to everyone.',
};

export default function AboutPage() {
  return (
    <div className="content-wrapper py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] text-center">
          Making knowledge free for{' '}
          <span className="gradient-text">everyone</span>
        </h1>

        <p className="mt-6 text-lg text-[var(--text-secondary)] text-center leading-relaxed">
          ANYFREEBOOK aggregates free, legal books from 40+ open-access sources worldwide and
          organizes them by profession. Our mission is simple: no one should be priced out
          of knowledge.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center my-16 py-12 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)]">
          <StatBlock number="1.7M+" label="Free Books" />
          <StatBlock number="45K+" label="Audiobooks" />
          <StatBlock number="500+" label="Professions" />
          <StatBlock number="40+" label="Sources" />
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">Our sources</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Every book on ANYFREEBOOK comes from verified, legal sources. We aggregate from
              Project Gutenberg, Open Library, Internet Archive, MIT OpenCourseWare, OpenStax,
              government repositories, Creative Commons publishers, and 30+ other open-access
              libraries worldwide.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">How it works</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Our scrapers continuously discover new free books across the internet. We normalize
              metadata, generate consistent covers, verify legal status, and organize everything
              by profession and subject. The result is a single, beautiful interface for the
              world&apos;s free knowledge.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-[var(--text)] mb-3">100% free, forever</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              ANYFREEBOOK will always be free. We believe education is a right, not a privilege.
              No paywalls, no premium tiers, no &ldquo;sign up to download&rdquo; tricks.
              Just free books.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
