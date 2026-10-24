import type { Metadata } from 'next';
import { ExploreCategories } from '@/components/ExploreCategories';
import { getAllCategories, getAllBooks } from '@/lib/data';
import { CATALOGUE } from '@/lib/catalogueStats';

export const metadata: Metadata = {
  title: `Explore All Categories — ${CATALOGUE.categories} Categories`,
  description: `Browse free books by category. Search ${CATALOGUE.liveBooks} free books and papers across ${CATALOGUE.categories} categories including technology, medicine, engineering, business, law, and more.`,
  openGraph: {
    title: `Explore ${CATALOGUE.categories} Categories — Free Books by Subject`,
    description: `Browse ${CATALOGUE.liveBooks} free books and papers across ${CATALOGUE.categories} categories.`,
    images: [{ url: '/api/og?title=Explore+All+Categories&subtitle=5M%2B+Free+Books+%E2%80%A2+241+Categories', width: 1200, height: 630 }],
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
