import type { Metadata } from 'next';
import { CollectionGrid } from '@/components/CollectionGrid';
import { getCollections } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Curated Collections — Free Book Lists | ANYFREEBOOK',
  description: 'Hand-picked free book collections: programming classics, medical school essentials, philosophy starter packs, and more.',
  openGraph: {
    title: 'Curated Collections — Free Book Lists',
    description: 'Hand-picked free book collections across every profession.',
    images: [{ url: '/api/og?title=Curated+Collections&subtitle=Hand-Picked+Free+Book+Lists', width: 1200, height: 630 }],
  },
};

export default function CollectionsPage() {
  const collections = getCollections();

  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
          📚 Curated Collections
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          Hand-picked reading lists for every profession and interest.
        </p>
      </div>

      <CollectionGrid collections={collections} />
    </div>
  );
}
