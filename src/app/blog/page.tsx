import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blogPosts';

export const metadata: Metadata = {
  title: 'Blog — Free Book Guides, Reviews & Reading Lists',
  description: 'Discover the best free books with our curated guides, reviews, and reading lists. New articles every week.',
  openGraph: {
    title: 'ANYFREEBOOK Blog — Free Book Guides & Reading Lists',
    description: 'Curated guides, reviews, and reading lists for free books.',
    images: [{ url: '/api/og?title=ANYFREEBOOK+Blog&subtitle=Free+Book+Guides+%26+Reading+Lists', width: 1200, height: 630 }],
  },
};

const gradients = [
  'from-blue-500/10 to-cyan-500/10',
  'from-emerald-500/10 to-green-500/10',
  'from-purple-500/10 to-violet-500/10',
  'from-amber-500/10 to-orange-500/10',
  'from-rose-500/10 to-pink-500/10',
  'from-teal-500/10 to-cyan-500/10',
];

export default function BlogPage() {
  // Newest first, sourced from the single BLOG_POSTS list (was previously a hand-duplicated array)
  const posts = [...BLOG_POSTS].sort((a, b) => +new Date(b.date) - +new Date(a.date));

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
        {posts.map((post, i) => (
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
                {post.description}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-3">{post.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
