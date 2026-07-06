import type { Metadata } from 'next';
import { BookGrid } from '@/components/BookGrid';
import { getAudiobooks } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Free Audiobooks — 45,000+ Free Audiobook Downloads',
  description: 'Listen to 45,000+ free audiobooks. Bestsellers, classics, and textbooks available as free audiobooks in MP3 format. No sign-up required.',
  openGraph: {
    title: 'Free Audiobooks — 45,000+ Downloads',
    description: 'Listen to 45,000+ free audiobooks. Bestsellers, classics, and textbooks in MP3.',
    images: [{ url: '/api/og?title=Free+Audiobooks&subtitle=45%2C000%2B+Free+Audiobook+Downloads', width: 1200, height: 630 }],
  },
};

export default function AudiobooksPage() {
  const audiobooks = getAudiobooks();

  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <div className="rounded-2xl p-8 md:p-12 bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-[var(--border-subtle)]">
          <span className="text-5xl block mb-4">🎧</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
            Free Audiobooks
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl">
            Listen to 45,000+ free audiobooks. Bestsellers, classics, and textbooks — all completely free and legal.
          </p>
        </div>
      </div>

      <BookGrid books={audiobooks} layout="grid" />
    </div>
  );
}
