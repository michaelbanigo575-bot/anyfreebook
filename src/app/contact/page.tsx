import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact ANYFREEBOOK',
  description: 'How to reach ANYFREEBOOK about privacy, copyright and legal questions.',
};

const CONTACTS = [
  { title: 'Copyright and legal', text: 'Takedown requests, rights questions and anything about our terms.', email: 'legal@anyfreebook.com' },
  { title: 'Privacy', text: 'Your data, your account, or asking us to delete something.', email: 'privacy@anyfreebook.com' },
];

export default function ContactPage() {
  return (
    <div className="content-wrapper py-5 max-w-2xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[var(--text)]">Contact us</h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        Many answers are in the <Link href="/faq" className="text-[var(--primary)] font-semibold">FAQ</Link>. For anything else, write to us.
      </p>
      <div className="mt-4 space-y-3">
        {CONTACTS.map(c => (
          <section key={c.email} className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
            <h2 className="text-lg font-bold text-[var(--text)]">{c.title}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{c.text}</p>
            <a href={`mailto:${c.email}`} className="inline-flex items-center min-h-[44px] text-sm font-semibold text-[var(--primary)] break-all">{c.email}</a>
          </section>
        ))}
      </div>
    </div>
  );
}
