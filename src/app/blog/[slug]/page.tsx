import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS, getBlogPost, type BlogBlock } from '@/lib/blogPosts';

export async function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.category + ' — ANYFREEBOOK Blog')}`, width: 1200, height: 630 }],
    },
  };
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="text-xl md:text-2xl font-display font-bold text-[var(--text)] mt-10 mb-4">{block.text}</h2>;
    case 'p':
      return <p className="text-[var(--text-secondary)] leading-relaxed mb-5">{block.text}</p>;
    case 'ul':
      return (
        <ul className="space-y-2 mb-6 pl-1">
          {block.items?.map((item, i) => (
            <li key={i} className="flex gap-2 text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--primary)] flex-shrink-0 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'book':
      return (
        <div className="mb-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text)]">{block.title}</h3>
              {block.author && <p className="text-xs text-[var(--text-muted)] mt-0.5">by {block.author}</p>}
              {block.note && <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{block.note}</p>}
            </div>
            <Link
              href={`/search?q=${encodeURIComponent(block.title || '')}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-xs font-semibold hover:shadow-md transition-all whitespace-nowrap"
            >
              Find it free
            </Link>
          </div>
        </div>
      );
    case 'tip':
      return (
        <div className="my-8 p-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/20 flex gap-3">
          <span className="text-xl flex-shrink-0">💡</span>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{block.text}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const others = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: 'en',
    image: `https://anyfreebook.com/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.category + ' — ANYFREEBOOK Blog')}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://anyfreebook.com/blog/${post.slug}` },
    author: { '@type': 'Organization', name: 'ANYFREEBOOK', url: 'https://anyfreebook.com' },
    publisher: {
      '@type': 'Organization',
      name: 'ANYFREEBOOK',
      url: 'https://anyfreebook.com',
      logo: { '@type': 'ImageObject', url: 'https://anyfreebook.com/logo.png' },
    },
  };

  return (
    <article className="content-wrapper py-8 max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8">
        <Link href="/" className="hover:text-[var(--text)] transition-colors">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-[var(--text)] transition-colors">Blog</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)] line-clamp-1">{post.title}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
            {post.category}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{post.readTime} read</span>
          <span className="text-xs text-[var(--text-muted)]">·</span>
          <span className="text-xs text-[var(--text-muted)]">{post.date}</span>
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-[var(--text)] leading-tight">
          {post.title}
        </h1>
      </header>

      <div>
        {post.content.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-center">
        <h2 className="text-lg font-bold">Search 5,000,000+ free books</h2>
        <p className="text-sm opacity-90 mt-1 mb-4">Every book in this article — and millions more — free and legal.</p>
        <Link href="/search" className="inline-flex px-6 py-2.5 rounded-xl bg-white text-[var(--primary)] text-sm font-bold hover:shadow-lg transition-all">
          Start searching
        </Link>
      </div>

      {others.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">More from the blog</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {others.map(p => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-md transition-all group"
              >
                <p className="text-[10px] font-bold text-[var(--primary)] mb-1">{p.category}</p>
                <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">{p.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
