import type { Metadata } from 'next';
import { BookGrid } from '@/components/BookGrid';
import { getTrendingBooks } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Trending Free Books — Most Popular This Week',
  description: 'See the most popular free books being read right now. Trending across all categories — technology, medicine, business, science, and more.',
  openGraph: {
    title: 'Trending Free Books — Most Popular This Week',
    description: 'The most popular free books being read right now.',
    images: [{ url: '/api/og?title=Trending+Free+Books&subtitle=Most+Popular+This+Week', width: 1200, height: 630 }],
  },
};

export default function TrendingPage() {
  const books = getTrendingBooks();

  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
          🔥 Trending this week
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          The most popular free books being read right now.
        </p>
      </div>

      <BookGrid books={books} layout="grid" />
    </div>
  );
}
