import Link from 'next/link';
import { BookCover } from './BookCover';
import type { Collection } from '@/lib/data';

export function CollectionGrid({ collections }: { collections: Collection[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map(collection => (
        <Link
          key={collection.id}
          href={`/collection/${collection.slug}`}
          className="group block rounded-xl p-5 bg-[var(--surface)] border border-[var(--border-subtle)] hover:shadow-xl hover:border-[var(--border)] transition-all duration-300"
        >
          {/* Stacked book covers preview */}
          <div className="flex items-end gap-1 mb-4 h-24 justify-center">
            {collection.coverBooks.slice(0, 4).map((book, i) => (
              <div
                key={book.id}
                className="transition-transform duration-300 group-hover:-translate-y-1"
                style={{
                  transform: `rotate(${(i - 1.5) * 5}deg)`,
                  zIndex: 4 - i,
                  marginLeft: i > 0 ? '-12px' : '0',
                }}
              >
                <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} size="xs" />
              </div>
            ))}
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
