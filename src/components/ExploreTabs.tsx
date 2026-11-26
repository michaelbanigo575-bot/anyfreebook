import Link from 'next/link';

const TABS = [
  { id: 'categories', label: 'Categories', href: '/explore' },
  { id: 'trending', label: 'Trending', href: '/trending' },
  { id: 'new', label: 'New', href: '/new' },
] as const;

/** One Explore area with three views. Each keeps its own address, so shared links keep working. */
export function ExploreTabs({ current }: { current: (typeof TABS)[number]['id'] }) {
  return (
    <nav aria-label="Explore views" className="grid grid-cols-3 max-w-md mb-4 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
      {TABS.map(t => (
        <Link key={t.id} href={t.href} aria-current={current === t.id ? 'page' : undefined}
          className={`flex items-center justify-center min-h-[40px] rounded-xl text-sm font-semibold ${current === t.id ? 'bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
