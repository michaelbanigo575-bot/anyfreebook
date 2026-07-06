import Link from 'next/link';

export function Footer() {
  const linkGroups = [
    {
      title: 'Browse',
      links: [
        { label: 'All Categories', href: '/explore' },
        { label: 'Trending', href: '/trending' },
        { label: 'New Arrivals', href: '/new' },
        { label: 'Audiobooks', href: '/audiobooks' },
        { label: 'Collections', href: '/collections' },
      ],
    },
    {
      title: 'Popular Categories',
      links: [
        { label: 'Technology', href: '/category/free-technology-books' },
        { label: 'Engineering', href: '/category/free-engineering-books' },
        { label: 'Medicine', href: '/category/free-medicine-books' },
        { label: 'Business', href: '/category/free-business-books' },
        { label: 'Sciences', href: '/category/free-science-books' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Study Plan & Reminders', href: '/study-plan' },
        { label: 'Free Textbook Alternatives', href: '/free-textbook-alternatives' },
        { label: 'For Universities', href: '/universities' },
        { label: 'Rewards & Referrals', href: '/rewards' },
      ],
    },
  ];

  return (
    <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)] mt-20 pb-20 md:pb-0">
      <div className="content-wrapper py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <span className="font-display font-bold text-lg text-[var(--text)]">ANYFREEBOOK</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
              The world&apos;s largest free book aggregator. 5M+ free books, textbooks & papers from 6 open-access sources.
            </p>
            <div className="flex gap-3 mt-4">
              {['Twitter', 'LinkedIn', 'TikTok', 'Instagram'].map(social => (
                <span
                  key={social}
                  className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors cursor-pointer"
                  title={social}
                >
                  {social[0]}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {linkGroups.map(group => (
            <div key={group.title}>
              <h4 className="font-semibold text-sm text-[var(--text)] mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} ANYFREEBOOK. All books sourced from legal, open-access repositories.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Built with care for readers worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
