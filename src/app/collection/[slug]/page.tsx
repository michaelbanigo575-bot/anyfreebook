import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BookGrid } from '@/components/BookGrid';
import { getCollections, getCollectionBySlug, getCollectionBooks } from '@/lib/data';

export async function generateStaticParams() {
  return getCollections().map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const collection = getCollectionBySlug(params.slug);
  if (!collection) return {};

  return {
    title: `${collection.title} — Free Books | ANYFREEBOOK`,
    description: collection.description,
    openGraph: {
      title: collection.title,
      description: collection.description,
      images: [{ url: `/api/og?title=${encodeURIComponent(collection.title)}&subtitle=${encodeURIComponent(collection.description)}&type=collection`, width: 1200, height: 630 }],
    },
  };
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = getCollectionBySlug(params.slug);
  if (!collection) notFound();

  const books = getCollectionBooks(params.slug);

  return (
    <div className="content-wrapper py-8">
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
        <a href="/" className="hover:text-[var(--text)] transition-colors">Home</a>
        <span>/</span>
        <a href="/explore" className="hover:text-[var(--text)] transition-colors">Collections</a>
        <span>/</span>
        <span className="text-[var(--text-secondary)] line-clamp-1">{collection.title}</span>
      </nav>

      <div className="max-w-2xl mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary-light)] text-[var(--primary)] mb-3">
          📚 Curated Collection
        </span>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-[var(--text)] leading-tight">
          {collection.title}
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          {collection.description}
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {books.length} free books in this collection
        </p>
      </div>

      {books.length > 0 ? (
        <BookGrid books={books} layout="grid" />
      ) : (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No books found in this collection yet</p>
        </div>
      )}
    </div>
  );
}
