import Link from 'next/link';
import type { Category } from '@/lib/data';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {categories.map(cat => (
        <Link
          key={cat.id}
          href={`/category/${cat.slug}`}
          className={`
            relative overflow-hidden rounded-xl p-5
            bg-gradient-to-br ${cat.gradient}
            hover:shadow-lg hover:-translate-y-0.5
            transition-all duration-300
            group border border-transparent hover:border-[var(--border)]
          `}
        >
          <span className="text-3xl block mb-2">{cat.icon}</span>
          <h3 className="font-semibold text-sm text-[var(--text)]">{cat.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {cat.bookCount.toLocaleString()} free books
          </p>
          <span className="absolute bottom-2 right-3 text-[var(--primary)] text-sm
            opacity-0 group-hover:opacity-100 transition-opacity">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
