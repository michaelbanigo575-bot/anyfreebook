import type { Metadata } from 'next';
import { ExploreCategories } from '@/components/ExploreCategories';
import { getAllCategories, getAllBooks } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Explore All Categories — 230+ Categories',
  description: 'Browse free books by category. 240+ curated free books across 230+ categories including technology, medicine, engineering, business, law, and more.',
  openGraph: {
    title: 'Explore 230+ Categories — Free Books by Subject',
    description: 'Browse 240+ curated free books across 230+ categories.',
    images: [{ url: '/api/og?title=Explore+All+Categories&subtitle=240%2B+Curated+Books+%E2%80%A2+230%2B+Categories', width: 1200, height: 630 }],
  },
};

export default function ExplorePage() {
  const categories = getAllCategories();
  const curated = getAllBooks().length;

  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
          Browse by profession
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          {curated} curated free books across {categories.length} categories. Every category streams
          live results from Open Library, the Internet Archive and Google Books — find exactly what you need.
        </p>
      </div>

      <ExploreCategories categories={categories} />
    </div>
  );
}
