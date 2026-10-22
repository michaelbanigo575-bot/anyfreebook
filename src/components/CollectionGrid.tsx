import Link from 'next/link';
import type { Collection } from '@/lib/data';

/**
 * Collection cover art is drawn in CSS (spines + a book glyph) instead of
 * loading remote cover images: archive.org covers answer 451/403, which left
 * broken images on the page. Nothing here can fail to load.
 */
const SPINE_COLORS = [
  'from-indigo-500/70 to-indigo-400/70',
  'from-emerald-500/70 to-teal-400/70',
  'from-amber-500/70 to-orange-400/70',
  'from-rose-500/70 to-pink-400/70',
];

export function CollectionGrid({ collections }: { collections: Collection[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection, ci) => (
        <Link
          key={collection.id}
          href={`/collection/${collection.slug}`}
          className="group block rounded-xl p-5 bg-[var(--surface)] border border-[var(--border-subtle)] hover:shadow-xl hover:border-[var(--border)] transition-all duration-300"
        >
          {/* Local cover art — stacked spines on the collection's gradient tile */}
          <div className="flex items-end justify-center gap-1.5 mb-4 h-24 rounded-xl bg-gradient-to-br from-[var(--gradient-start)]/15 to-[var(--gradient-end)]/15 px-4 pt-4">
            {SPINE_COLORS.map((color, i) => (
              <span
                key={color}
                className={`w-5 rounded-t-md bg-gradient-to-t ${color}`}
                style={{
                  height: `${50 + ((ci + i) % 3) * 12}px`,
                  transform: `rotate(${((ci + i) - 2.5) * 3}deg)`,
                }}
              />
            ))}
            <span className="text-2xl ml-1 mb-1" aria-hidden="true">📖</span>
          </div>

          <h3 className="font-semibold text-[var(--text)] text-sm line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
            {collection.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
            {collection.description}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium">
            {collection.bookCount} books →
          </p>
        </Link>
      ))}
    </div>
  );
}
