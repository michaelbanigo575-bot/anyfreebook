import type { Metadata } from 'next';
import { BookGrid } from '@/components/BookGrid';
import { getAudiobooks } from '@/lib/data';
import { searchLibrivox } from '@/lib/api/librivox';
import { searchArchiveAudio } from '@/lib/api/archive';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Free Audiobooks — Public-Domain Audio from LibriVox & Archive',
  description: 'Listen to free public-domain audiobooks from LibriVox and the Internet Archive. Bestsellers, classics, and textbooks in MP3 format. No sign-up required.',
  openGraph: {
    title: 'Free Audiobooks — LibriVox & Internet Archive',
    description: 'Free public-domain audiobooks from LibriVox and the Internet Archive.',
    images: [{ url: '/api/og?title=Free+Audiobooks&subtitle=Free%20Public-Domain%20Audiobooks', width: 1200, height: 630 }],
  },
};

export default async function AudiobooksPage() {
  const curated = getAudiobooks();

  const [librivox, iaAudio] = await Promise.allSettled([
    searchLibrivox('popular', 15),
    searchArchiveAudio('audiobook OR lecture OR podcast', 1, 15),
  ]);

  const live = [
    ...(librivox.status === 'fulfilled' ? librivox.value.books : []),
    ...(iaAudio.status === 'fulfilled' ? iaAudio.value.books : []),
  ];

  const seen = new Set(curated.map(b => b.title.toLowerCase().trim()));
  const audiobooks = [...curated];
  for (const b of live) {
    const key = b.title.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); audiobooks.push(b); }
  }

  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <div className="rounded-2xl p-8 md:p-12 bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-[var(--border-subtle)]">
          <span className="text-5xl block mb-4">🎧</span>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
            Free Audiobooks
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl">
            Listen to free public-domain audiobooks from LibriVox and the Internet Archive. Bestsellers, classics, and textbooks — all legal and free to listen to.
          </p>
        </div>
      </div>

      <BookGrid books={audiobooks} layout="grid" />
    </div>
  );
}
