import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — ANYFREEBOOK',
  description: 'ANYFREEBOOK privacy policy. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="content-wrapper py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-8">Privacy Policy</h1>
      <div className="prose-styles space-y-6 text-[var(--text-secondary)] leading-relaxed">
        <p><strong className="text-[var(--text)]">Last updated:</strong> July 2026</p>

        <Section title="Information We Collect">
          <p>We collect minimal information to improve your experience:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information (email, name) when you sign in</li>
            <li>Reading preferences and settings stored locally</li>
            <li>Anonymous usage analytics (page views, popular categories)</li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          <p>Your data is used to personalize recommendations, sync reading progress, and improve the platform. We never sell personal data to third parties.</p>
        </Section>

        <Section title="Cookies & Local Storage">
          <p>We use localStorage for theme preferences, reading progress, and interaction history. Third-party ads (Google AdSense) may set cookies for ad personalization.</p>
        </Section>

        <Section title="Third-Party Services">
          <ul className="list-disc pl-6 space-y-1">
            <li>Google AdSense — advertising</li>
            <li>Vercel Analytics — anonymous performance metrics</li>
            <li>Supabase — authentication and database</li>
          </ul>
        </Section>

        <Section title="Your Rights">
          <p>You can export or delete your data at any time from Settings &gt; Account. Contact us at privacy@anyfreebook.com for any concerns.</p>
        </Section>

        <Section title="Contact">
          <p>Email: <a href="mailto:privacy@anyfreebook.com" className="text-[var(--primary)] hover:underline">privacy@anyfreebook.com</a></p>
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
