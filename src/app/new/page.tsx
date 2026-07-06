import type { Metadata } from 'next';
import { BookGrid } from '@/components/BookGrid';
import { getNewBooks } from '@/lib/data';

export const metadata: Metadata = {
  title: 'New Arrivals — Latest Free Books | ANYFREEBOOK',
  description: 'Discover the latest free books just added to ANYFREEBOOK. Fresh titles across every profession and genre.',
  openGraph: {
    title: 'New Arrivals — Latest Free Books',
    description: 'Fresh free books just added to ANYFREEBOOK.',
    images: [{ url: '/api/og?title=New+Arrivals&subtitle=Latest+Free+Books', width: 1200, height: 630 }],
  },
};

export default function NewArrivalsPage() {
  const books = getNewBooks();

  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
          ✨ New Arrivals
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          The latest free books just added to our library.
        </p>
      </div>

      <BookGrid books={books} layout="grid" />
    </div>
  );
}
