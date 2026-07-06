import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Free Book Guides, Reviews & Reading Lists',
  description: 'Discover the best free books with our curated guides, reviews, and reading lists. New articles every week.',
  openGraph: {
    title: 'ANYFREEBOOK Blog — Free Book Guides & Reading Lists',
    description: 'Curated guides, reviews, and reading lists for free books.',
    images: [{ url: '/api/og?title=ANYFREEBOOK+Blog&subtitle=Free+Book+Guides+%26+Reading+Lists', width: 1200, height: 630 }],
  },
};

const POSTS = [
  {
    title: 'Top 25 Free Programming Books in 2026',
    slug: 'top-25-free-programming-books-2026',
    excerpt: 'The best free programming books for every language and skill level. From Python beginners to systems programming experts.',
    category: 'Technology',
    readTime: '12 min',
    date: 'Jan 15, 2026',
  },
  {
    title: 'Free Alternatives to Campbell Biology (Save $189)',
    slug: 'free-alternatives-campbell-biology',
    excerpt: "Campbell Biology costs $189. Here are the best free alternatives that cover the same material — legally and completely free.",
    category: 'Sciences',
    readTime: '8 min',
    date: 'Jan 10, 2026',
  },
  {
    title: 'Learn Machine Learning for Free — Complete Reading List',
    slug: 'learn-machine-learning-free-reading-list',
    excerpt: '15 free books that take you from ML beginner to practitioner. Organized by difficulty with estimated study times.',
    category: 'Technology',
    readTime: '10 min',
    date: 'Jan 5, 2026',
  },
  {
    title: 'Where to Download Free Medical Textbooks Online',
    slug: 'where-to-download-free-medical-textbooks',
    excerpt: 'A complete guide to finding free, legal medical textbooks. Covers anatomy, pharmacology, pathology, and more.',
    category: 'Medicine',
    readTime: '9 min',
    date: 'Dec 28, 2025',
  },
  {
    title: 'The 15 Best Free Audiobooks of All Time',
    slug: '15-best-free-audiobooks-all-time',
    excerpt: 'From Sapiens to 1984, these free audiobooks are worth every minute of your time. All legally free.',
    category: 'Collections',
    readTime: '7 min',
    date: 'Dec 20, 2025',
  },
  {
    title: "Free Alternatives to Mankiw's Principles of Economics (Save $170)",
    slug: 'free-alternatives-mankiw-economics',
    excerpt: "Gregory Mankiw's textbook costs $170. These free alternatives are just as good — used at top universities worldwide.",
    category: 'Economics',
    readTime: '8 min',
    date: 'Dec 15, 2025',
  },
];

const gradients = [
  'from-blue-500/10 to-cyan-500/10',
  'from-emerald-500/10 to-green-500/10',
  'from-purple-500/10 to-violet-500/10',
  'from-amber-500/10 to-orange-500/10',
  'from-rose-500/10 to-pink-500/10',
  'from-teal-500/10 to-cyan-500/10',
];

export default function BlogPage() {
  return (
    <div className="content-wrapper py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)]">
          Blog
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          Free book guides, reviews, and curated reading lists.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {POSTS.map((post, i) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border-subtle)] hover:shadow-xl hover:border-[var(--border)] transition-all duration-300"
          >
            {/* Image placeholder */}
            <div className={`h-40 bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center`}>
              <span className="text-4xl">📖</span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                  {post.category}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{post.readTime}</span>
              </div>
              <h2 className="font-semibold text-[var(--text)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">
                {post.excerpt}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-3">{post.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
