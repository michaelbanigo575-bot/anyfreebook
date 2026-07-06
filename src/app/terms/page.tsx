import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — ANYFREEBOOK',
  description: 'ANYFREEBOOK terms of service. Read our terms for using the platform.',
};

export default function TermsPage() {
  return (
    <div className="content-wrapper py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-8">Terms of Service</h1>
      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        <p><strong className="text-[var(--text)]">Last updated:</strong> July 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>By using ANYFREEBOOK, you agree to these terms. If you do not agree, please do not use the platform.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>ANYFREEBOOK is a free book aggregation platform that indexes and links to legally free books from open-access sources including Project Gutenberg, Open Library, LibriVox, Internet Archive, and others. We do not host copyrighted content.</p>
        </Section>

        <Section title="3. User Accounts">
          <p>Account creation is optional. Signed-in users can sync preferences and reading progress. You are responsible for maintaining the security of your account.</p>
        </Section>

        <Section title="4. Content & Copyright">
          <p>All books linked on ANYFREEBOOK are sourced from public domain or open-access repositories. If you believe content infringes your copyright, contact us at legal@anyfreebook.com for prompt removal.</p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You may not use automated scraping tools against our platform, attempt to circumvent access controls, or use the service for any unlawful purpose.</p>
        </Section>

        <Section title="6. Disclaimer">
          <p>ANYFREEBOOK is provided &ldquo;as is&rdquo; without warranties. We are not responsible for the content, availability, or accuracy of third-party book sources.</p>
        </Section>

        <Section title="7. Contact">
          <p>Email: <a href="mailto:legal@anyfreebook.com" className="text-[var(--primary)] hover:underline">legal@anyfreebook.com</a></p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-display font-semibold text-[var(--text)] mb-3">{title}</h2>
      {children}
    </section>
  );
}
