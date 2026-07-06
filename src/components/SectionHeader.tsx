import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  icon: string;
  action?: { label: string; href: string };
}

export function SectionHeader({ title, icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--text)]">
        <span className="mr-2">{icon}</span>{title}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="text-sm text-[var(--primary)] hover:underline font-medium transition-colors"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
