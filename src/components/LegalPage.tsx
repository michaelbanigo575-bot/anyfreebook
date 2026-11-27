import Link from 'next/link';
import type { ReactNode } from 'react';

export const POLICY_DATE = '27 November 2026';

const POLICIES = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/community-rules', label: 'Community Rules' },
  { href: '/copyright', label: 'Copyright' },
];

/** The shared layout of the policy pages. */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="content-wrapper py-7 max-w-3xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: {POLICY_DATE}</p>
      <div className="mt-5 space-y-6 text-[var(--text-secondary)] leading-relaxed break-words">
        <div>{intro}</div>
        {children}
        <nav aria-label="Other policies" className="flex flex-wrap gap-x-4 pt-4 border-t border-[var(--border-subtle)]">
          {POLICIES.map(p => <Link key={p.href} href={p.href} className="inline-flex items-center min-h-[40px] text-sm font-semibold text-[var(--primary)]">{p.label}</Link>)}
        </nav>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-display font-semibold text-[var(--text)] mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export const List = ({ children }: { children: ReactNode }) => <ul className="list-disc pl-6 space-y-1.5">{children}</ul>;

export const Mail = ({ to }: { to: string }) => <a href={`mailto:${to}`} className="text-[var(--primary)] hover:underline break-all">{to}</a>;
