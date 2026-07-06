# ANYFREEBOOK — Premium Design, SEO & Performance Engine

---

## SECTION 1: SCHEMA MARKUP (Rich Results Engine)

### Every Page Type Gets Its Own Schema

Schema markup turns plain Google results into rich, eye-catching cards with star ratings, FAQs, breadcrumbs, pricing ("FREE"), and a search box. Pages with rich results get 2–3x higher click-through rates than plain results.

### Complete Schema Implementation

```typescript
// lib/seo/schema.ts
// Auto-generates all Schema.org structured data for every page

// ─────────────────────────────────────────────────
// 1. WEBSITE SCHEMA (Homepage only)
// Gives Google the sitewide search box in results
// ─────────────────────────────────────────────────
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ANYFREEBOOK',
    alternateName: 'Any Free Book',
    url: 'https://anyfreebook.com',
    description: 'The world\'s largest free book aggregator. 247,000+ free books, audiobooks, comics, and magazines across 500+ professions.',
    publisher: organizationSchema(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://anyfreebook.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ─────────────────────────────────────────────────
// 2. ORGANIZATION SCHEMA
// Shows your brand info in Google's Knowledge Panel
// ─────────────────────────────────────────────────
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ANYFREEBOOK',
    url: 'https://anyfreebook.com',
    logo: 'https://anyfreebook.com/logo.png',
    sameAs: [
      'https://twitter.com/anyfreebook',
      'https://linkedin.com/company/anyfreebook',
      'https://tiktok.com/@anyfreebook',
      'https://instagram.com/anyfreebook',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@anyfreebook.com',
      contactType: 'customer support',
    },
  };
}

// ─────────────────────────────────────────────────
// 3. BOOK SCHEMA (200,000+ pages)
// Shows book details, rating, and "FREE" price in results
// ─────────────────────────────────────────────────
export function bookSchema(book: any) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    headline: `${book.title} — Free Download`,
    author: {
      '@type': 'Person',
      name: book.author,
    },
    description: book.description,
    url: `https://anyfreebook.com/book/${book.slug}`,
    image: book.coverUrl,
    inLanguage: book.language || 'en',
    genre: book.category?.name,
    bookFormat: 'https://schema.org/EBook',
    numberOfPages: book.pageCount || undefined,
    datePublished: book.publishYear ? `${book.publishYear}` : undefined,
    isbn: book.isbn || undefined,
    publisher: book.publisher ? {
      '@type': 'Organization',
      name: book.publisher,
    } : undefined,

    // This makes Google show "FREE" next to the result
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `https://anyfreebook.com/book/${book.slug}`,
    },
  };

  // Add aggregate rating if available
  if (book.rating && book.ratingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: book.rating.toFixed(1),
      ratingCount: book.ratingCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Add reviews if available
  if (book.reviews && book.reviews.length > 0) {
    schema.review = book.reviews.slice(0, 5).map((review: any) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.user.name || 'Reader' },
      datePublished: review.createdAt,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: '5',
      },
      reviewBody: review.comment,
    }));
  }

  // Add available formats as workExample
  if (book.sources && book.sources.length > 0) {
    schema.workExample = book.sources.map((source: any) => ({
      '@type': 'Book',
      bookFormat: source.format === 'PDF' ? 'https://schema.org/EBook' : 'https://schema.org/EBook',
      url: `https://anyfreebook.com/book/${book.slug}?format=${source.format.toLowerCase()}`,
    }));
  }

  return schema;
}

// ─────────────────────────────────────────────────
// 4. AUDIOBOOK SCHEMA
// Shows audiobook details with duration and narrator
// ─────────────────────────────────────────────────
export function audiobookSchema(book: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Audiobook',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    readBy: { '@type': 'Person', name: book.narrator || 'Various' },
    description: book.description,
    url: `https://anyfreebook.com/audiobook/${book.slug}`,
    image: book.coverUrl,
    duration: book.duration ? `PT${Math.floor(book.duration / 3600)}H${Math.floor((book.duration % 3600) / 60)}M` : undefined,
    inLanguage: book.language || 'en',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: book.rating ? {
      '@type': 'AggregateRating',
      ratingValue: book.rating.toFixed(1),
      ratingCount: book.ratingCount,
      bestRating: '5',
    } : undefined,
  };
}

// ─────────────────────────────────────────────────
// 5. FAQ SCHEMA (every category page)
// Creates expandable FAQ dropdowns in Google results
// ─────────────────────────────────────────────────
export function faqSchema(category: string, count: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Where can I find free ${category.toLowerCase()} books?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `ANYFREEBOOK has ${count.toLocaleString()}+ free ${category.toLowerCase()} books aggregated from 40+ open-access sources including Open Library, MIT OCW, OpenStax, and Project Gutenberg. Browse and download at anyfreebook.com.`,
        },
      },
      {
        '@type': 'Question',
        name: `Are these ${category.toLowerCase()} books really free and legal?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes. Every book on ANYFREEBOOK comes from verified legal sources — public domain works, Creative Commons publications, government repositories, and open-access academic libraries. We only link to legally free content.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I download free ${category.toLowerCase()} books as PDF?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Most ${category.toLowerCase()} books on ANYFREEBOOK are available in multiple formats including PDF, EPUB, and plain text. Some also have free audiobook versions. Check each book's page for available download formats.`,
        },
      },
      {
        '@type': 'Question',
        name: `How many free ${category.toLowerCase()} books does ANYFREEBOOK have?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `ANYFREEBOOK currently has ${count.toLocaleString()}+ free ${category.toLowerCase()} books, and the collection grows daily as our scrapers discover new open-access content across 40+ sources worldwide.`,
        },
      },
    ],
  };
}

// ─────────────────────────────────────────────────
// 6. BREADCRUMB SCHEMA (every page)
// Shows navigable path in Google results
// ─────────────────────────────────────────────────
export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `https://anyfreebook.com${crumb.path}`,
    })),
  };
}

// Usage:
// breadcrumbSchema([
//   { name: 'Home', path: '/' },
//   { name: 'Engineering', path: '/free-engineering-books' },
//   { name: 'Python', path: '/free-python-books' },
//   { name: 'Clean Code', path: '/book/clean-code-martin' },
// ])

// Google shows: Home > Engineering > Python > Clean Code

// ─────────────────────────────────────────────────
// 7. ARTICLE SCHEMA (blog posts)
// Shows publish date, author, and image in results
// ─────────────────────────────────────────────────
export function articleSchema(post: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.ogImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'ANYFREEBOOK',
      url: 'https://anyfreebook.com',
    },
    publisher: organizationSchema(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://anyfreebook.com/blog/${post.slug}`,
    },
  };
}

// ─────────────────────────────────────────────────
// 8. COLLECTION SCHEMA (ItemList for listicles and collections)
// Shows numbered list directly in Google results
// ─────────────────────────────────────────────────
export function collectionSchema(title: string, books: any[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: books.length,
    itemListElement: books.map((book, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Book',
        name: book.title,
        author: { '@type': 'Person', name: book.author },
        url: `https://anyfreebook.com/book/${book.slug}`,
        image: book.coverUrl,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    })),
  };
}

// ─────────────────────────────────────────────────
// INJECTOR: Adds all relevant schemas to any page
// ─────────────────────────────────────────────────
export function injectSchemas(schemas: any[]) {
  return schemas.map((schema, i) => (
    `<script type="application/ld+json" key="schema-${i}">
      ${JSON.stringify(schema)}
    </script>`
  )).join('\n');
}
```

### How to Apply Schema in Next.js Layout

```tsx
// app/book/[slug]/page.tsx

export default async function BookPage({ params }) {
  const book = await getBook(params.slug);

  const schemas = [
    bookSchema(book),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: book.category.name, path: `/${book.category.slug}` },
      { name: book.title, path: `/book/${book.slug}` },
    ]),
  ];

  return (
    <>
      {/* Schema markup in the <head> */}
      {schemas.map((schema, i) => (
        <script
          key={`schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* Page content */}
      <BookDetailPage book={book} />
    </>
  );
}
```

---

## SECTION 2: HIGH-INTENT LISTICLE CONTENT ENGINE

### The Strategy

People search in patterns. The most common book-search patterns are "Top X free [topic] books", "Best free [subject] textbooks", "Where to find free [genre] books online", and "Free alternatives to [expensive book]." Every listicle blog post is a net catching these searches.

### Listicle Templates (Auto-Generate with Claude API)

```typescript
// lib/content/listicle-generator.ts

export const LISTICLE_TEMPLATES = [

  // TEMPLATE 1: "Top X Free [Category] Books"
  // Target: "free python books", "best free nursing textbooks"
  {
    titleTemplate: 'Top {count} Free {category} Books in {year}',
    slugTemplate: 'top-{count}-free-{category}-books-{year}',
    targetKeywords: [
      'free {category} books',
      'best free {category} textbooks',
      'free {category} books download',
      '{category} books PDF free',
    ],
    structure: [
      'intro_paragraph',          // Keyword in first 100 words
      'quick_picks_table',        // Summary table with all books
      'book_1_deep_dive',         // Each book: cover, description, why it's good, link
      'book_2_deep_dive',
      '... (one per book)',
      'comparison_table',         // Side-by-side comparison
      'how_to_choose',            // Buying guide style section
      'faq_section',              // FAQ with schema markup
      'related_collections_cta',  // Internal links to related content
    ],
  },

  // TEMPLATE 2: "Free Alternatives to [Expensive Textbook]"
  // Target: "campbell biology free", "[textbook] free PDF"
  {
    titleTemplate: 'Free Alternatives to {textbook} (Save ${price})',
    slugTemplate: 'free-alternatives-{textbook-slug}',
    targetKeywords: [
      'free alternative to {textbook}',
      '{textbook} free PDF',
      '{textbook} free download',
      'books like {textbook} free',
    ],
    structure: [
      'intro_with_price_comparison',
      'why_it_costs_so_much',
      'alternative_1_review',
      'alternative_2_review',
      '...',
      'comparison_table',
      'which_alternative_is_best',
      'faq_section',
      'full_category_cta',
    ],
  },

  // TEMPLATE 3: "Where to [Action] Free [Genre] [Type] Online"
  // Target: "where to read free romance novels", "free thriller ebooks"
  {
    titleTemplate: 'Where to {action} Free {genre} {type} Online in {year}',
    slugTemplate: 'where-to-{action}-free-{genre}-{type}-online',
    targetKeywords: [
      'free {genre} {type} online',
      'read free {genre} {type}',
      'download free {genre} {type}',
      'best free {genre} {type} sites',
    ],
    structure: [
      'intro_paragraph',
      'source_1_review',         // Review each platform
      'source_2_review',
      '...',
      'top_picks_from_each',
      'comparison_table',
      'faq_section',
    ],
  },

  // TEMPLATE 4: "Learn [Skill] for Free: Complete Reading List"
  // Target: "learn python free", "free machine learning books"
  {
    titleTemplate: 'Learn {skill} for Free — {count} Books From Beginner to Expert',
    slugTemplate: 'learn-{skill}-free-complete-reading-list',
    targetKeywords: [
      'learn {skill} free',
      'free {skill} books',
      '{skill} books for beginners free',
      'best books to learn {skill}',
    ],
    structure: [
      'intro_why_this_skill',
      'beginner_section',         // Books grouped by level
      'intermediate_section',
      'advanced_section',
      'learning_path_visual',     // Visual roadmap
      'how_long_will_it_take',
      'faq_section',
    ],
  },

  // TEMPLATE 5: "Best Free [Topic] Books on [Source]"
  // Target: "free engineering textbooks", "free books on open library"
  {
    titleTemplate: '{count} Best Free {topic} Books on {source}',
    slugTemplate: 'best-free-{topic}-books-{source}',
    targetKeywords: [
      'free {topic} books {source}',
      'best free books on {source}',
      '{source} free {topic} books',
    ],
    structure: [
      'intro_about_source',
      'book_reviews',
      'how_to_access',
      'other_sources_for_topic',
      'faq_section',
    ],
  },
];

// CONTENT CALENDAR: Generate 500+ listicle topics automatically
export function generateContentCalendar(categories: string[]): ContentTopic[] {
  const topics: ContentTopic[] = [];
  const year = new Date().getFullYear();

  for (const category of categories) {
    // Template 1: Top X for every category
    topics.push({
      title: `Top 25 Free ${category} Books in ${year}`,
      slug: `top-25-free-${slugify(category)}-books-${year}`,
      template: 'top_x',
      priority: 'high',
    });

    // Template 4: Learning path for every skill
    topics.push({
      title: `Learn ${category} for Free — Complete Reading List`,
      slug: `learn-${slugify(category)}-free-complete-reading-list`,
      template: 'learning_path',
      priority: 'high',
    });

    // Template 3: Where to find for every genre
    topics.push({
      title: `Where to Download Free ${category} Books Online in ${year}`,
      slug: `where-to-download-free-${slugify(category)}-books-online`,
      template: 'where_to',
      priority: 'medium',
    });
  }

  // Template 2: Alternatives for popular expensive textbooks
  const expensiveBooks = [
    { name: 'Campbell Biology', price: 189, category: 'Biology' },
    { name: 'Principles of Economics (Mankiw)', price: 170, category: 'Economics' },
    { name: 'Introduction to Algorithms (CLRS)', price: 95, category: 'Computer Science' },
    { name: 'Harrison\'s Principles of Internal Medicine', price: 199, category: 'Medicine' },
    { name: 'Fundamentals of Nursing', price: 165, category: 'Nursing' },
    { name: 'Organic Chemistry (McMurry)', price: 180, category: 'Chemistry' },
    { name: 'Thomas\' Calculus', price: 160, category: 'Mathematics' },
    { name: 'Psychology (Myers)', price: 155, category: 'Psychology' },
    { name: 'Anatomy & Physiology (Marieb)', price: 175, category: 'Medical' },
    { name: 'Engineering Mechanics: Statics', price: 140, category: 'Engineering' },
    // ... add 100+ more popular textbooks
  ];

  for (const book of expensiveBooks) {
    topics.push({
      title: `Free Alternatives to ${book.name} (Save $${book.price})`,
      slug: `free-alternatives-${slugify(book.name)}`,
      template: 'alternative',
      priority: 'high',
    });
  }

  return topics;
}
```

### Publishing Cadence

```
Month 1:   50 listicles (top categories + most expensive textbook alternatives)
Month 2:   50 more (expand to subcategories)
Month 3:   50 more (learning paths + source reviews)
Month 4-6: 30/month (fill remaining categories)
Month 6+:  10/month (updates, seasonal, new books)

Target by Month 12: 300+ high-intent listicle blog posts
Each post targets 3-5 long-tail keywords = 1,000+ ranking keywords
```

---

## SECTION 3: XML SITEMAP (Auto-Generated)

### Implementation

```typescript
// app/sitemap.ts
// Next.js 14 built-in sitemap generation
// This auto-generates and serves sitemap.xml at anyfreebook.com/sitemap.xml

import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://anyfreebook.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/new`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Category pages (500+)
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
  });
  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url: `${baseUrl}/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Book pages (200,000+) — paginate for large sitemaps
  const books = await prisma.book.findMany({
    select: { slug: true, contentType: true, updatedAt: true },
    orderBy: { viewCount: 'desc' },
    take: 50000, // Google supports up to 50,000 URLs per sitemap
  });
  const bookPages: MetadataRoute.Sitemap = books.map(book => ({
    url: `${baseUrl}/${book.contentType === 'AUDIOBOOK' ? 'audiobook' : 'book'}/${book.slug}`,
    lastModified: book.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Blog posts
  const posts = await prisma.blogPost.findMany({
    select: { slug: true, updatedAt: true },
  });
  const blogPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...bookPages, ...blogPages];
}

// For sites with 200,000+ pages, use a sitemap index:
// app/sitemap/[id]/route.ts — generates chunked sitemaps
// sitemap-0.xml (first 50,000 URLs)
// sitemap-1.xml (next 50,000 URLs)
// sitemap-2.xml (next 50,000 URLs)
// sitemap-3.xml (next 50,000 URLs)
// sitemap-index.xml (points to all chunks)
```

### Google Search Console Submission

```
1. Go to search.google.com/search-console
2. Add property → anyfreebook.com
3. Verify ownership (DNS TXT record via Cloudflare)
4. Go to Sitemaps → Add
5. Enter: https://anyfreebook.com/sitemap.xml
6. Click Submit

Google begins crawling and indexing within 24-48 hours.
Re-submit whenever major content is added.
Vercel auto-regenerates the sitemap on every deploy.
```

---

## SECTION 4: MOBILE SPEED OPTIMIZATION

### Image Pipeline (WebP, AVIF, Blur Placeholders)

```typescript
// next.config.js — Image optimization config

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Auto-convert to modern formats
    formats: ['image/avif', 'image/webp'],

    // Allowed external image domains (book cover sources)
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'books.google.com' },
      { protocol: 'https', hostname: 'archive.org' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
    ],

    // Responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Minimize quality for speed (80 is visually identical to 100)
    minimumCacheTTL: 2592000, // Cache for 30 days
  },

  // Enable compression
  compress: true,

  // Strict performance budgets
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'lodash'],
  },
};
```

### Book Cover Image Component (Responsive + Optimized)

```tsx
// components/BookCover.tsx

import Image from 'next/image';

interface BookCoverProps {
  src: string | null;
  title: string;
  author: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  priority?: boolean;
  className?: string;
}

const SIZES = {
  xs:   { w: 48,  h: 72,  imgSizes: '48px' },    // Tiny list items
  sm:   { w: 80,  h: 120, imgSizes: '80px' },     // Compact cards
  md:   { w: 128, h: 192, imgSizes: '128px' },    // Standard cards
  lg:   { w: 200, h: 300, imgSizes: '200px' },    // Featured cards
  xl:   { w: 280, h: 420, imgSizes: '280px' },    // Book detail page
  hero: { w: 400, h: 600, imgSizes: '400px' },    // Hero sections
};

// Placeholder cover for books without images
const PLACEHOLDER_COLORS = [
  'from-blue-600 to-blue-800',
  'from-emerald-600 to-emerald-800',
  'from-purple-600 to-purple-800',
  'from-amber-600 to-amber-800',
  'from-rose-600 to-rose-800',
  'from-cyan-600 to-cyan-800',
  'from-indigo-600 to-indigo-800',
  'from-teal-600 to-teal-800',
];

export function BookCover({ src, title, author, size, priority, className }: BookCoverProps) {
  const dim = SIZES[size];

  // Generate consistent color from title (same title always = same color)
  const colorIndex = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    % PLACEHOLDER_COLORS.length;

  if (!src) {
    // Beautiful generated placeholder when no cover exists
    return (
      <div
        className={`
          relative overflow-hidden rounded-lg shadow-lg
          bg-gradient-to-br ${PLACEHOLDER_COLORS[colorIndex]}
          flex flex-col justify-end p-3
          ${className}
        `}
        style={{ width: dim.w, height: dim.h }}
        role="img"
        aria-label={`Cover of "${title}" by ${author}`}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <p className="text-white font-semibold text-xs leading-tight line-clamp-3">
            {title}
          </p>
          <p className="text-white/70 text-[10px] mt-1 line-clamp-1">
            {author}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg shadow-lg group ${className}`}
      style={{ width: dim.w, height: dim.h }}
    >
      <Image
        src={src}
        alt={`Cover of "${title}" by ${author} — free download on ANYFREEBOOK`}
        width={dim.w}
        height={dim.h}
        sizes={dim.imgSizes}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={80}
        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgcI/8QAIhAAAQMEAgIDAAAAAAAAAAAAAQIDBAUGESEABxIxQVGB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQP/xAAYEQEBAQEBAAAAAAAAAAAAAAABAgARIf/aAAwDAQACEQMRAD8AE7du3"
      />

      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
}
```

### Core Web Vitals Optimization

```typescript
// lib/performance/optimizations.ts

// 1. LARGEST CONTENTFUL PAINT (LCP) — Target: < 2.5 seconds
// The hero section and first visible book covers must load instantly
// Solution: priority loading for above-the-fold images

// 2. FIRST INPUT DELAY (FID) — Target: < 100ms
// JavaScript must not block user interactions
// Solution: Code splitting, lazy loading, dynamic imports

// 3. CUMULATIVE LAYOUT SHIFT (CLS) — Target: < 0.1
// Nothing should jump around as the page loads
// Solution: Fixed dimensions on all images and ads, skeleton loaders

// Code splitting: Only load what's needed per page
import dynamic from 'next/dynamic';

// Heavy components loaded only when needed
const TTSPlayer = dynamic(() => import('@/components/TTSPlayer'), {
  ssr: false,
  loading: () => <TTSPlayerSkeleton />,
});

const BookReader = dynamic(() => import('@/components/BookReader'), {
  ssr: false,
  loading: () => <ReaderSkeleton />,
});

const ThemeCustomizer = dynamic(() => import('@/components/ThemeCustomizer'), {
  ssr: false,
});

// Skeleton loaders prevent layout shift
function BookCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-neutral-200 dark:bg-neutral-700 rounded-lg"
        style={{ width: 128, height: 192 }} />
      <div className="mt-2 h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
      <div className="mt-1 h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
    </div>
  );
}
```

### Performance Budget

```
TARGET METRICS (tested on 3G connection, mid-range phone):

Page Load:
  First Contentful Paint (FCP):     < 1.5s
  Largest Contentful Paint (LCP):   < 2.5s
  Time to Interactive (TTI):        < 3.5s
  Total Blocking Time (TBT):       < 200ms
  Cumulative Layout Shift (CLS):   < 0.1

Bundle Size:
  First load JS:                    < 100KB gzipped
  Per-page JS:                      < 30KB gzipped
  CSS:                              < 20KB gzipped

Images:
  Book covers:                      < 15KB each (WebP, 80% quality)
  Hero images:                      < 50KB (WebP, responsive srcset)
  OG images:                        < 30KB (WebP)
  All images lazy-loaded except first 4 visible

Lighthouse Score Target: 95+ on all four categories
  Performance: 95+
  Accessibility: 100
  Best Practices: 100
  SEO: 100
```

---

## SECTION 5: PREMIUM VISUAL DESIGN SYSTEM

### Design Philosophy

ANYFREEBOOK should feel like walking into a beautifully lit, perfectly organized modern library. Clean. Spacious. Every book given room to breathe. The design communicates trust, authority, and generosity — this is a place that respects your time and gives freely.

Think of the visual language of Stripe (clean typography), Apple (whitespace and product focus), Spotify (personalized content grids), and a Tsutaya bookstore in Tokyo (curated beauty).

### Design Tokens

```css
/* styles/design-tokens.css */

:root {
  /* ── SPACING SCALE ── */
  /* Based on 4px grid, golden ratio progression for larger values */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* ── TYPOGRAPHY SCALE ── */
  --text-xs: 0.75rem;     /* 12px — labels, badges */
  --text-sm: 0.875rem;    /* 14px — secondary text, metadata */
  --text-base: 1rem;      /* 16px — body text */
  --text-lg: 1.125rem;    /* 18px — emphasized body */
  --text-xl: 1.25rem;     /* 20px — card titles */
  --text-2xl: 1.5rem;     /* 24px — section headers */
  --text-3xl: 1.875rem;   /* 30px — page titles */
  --text-4xl: 2.25rem;    /* 36px — hero subtitle */
  --text-5xl: 3rem;       /* 48px — hero headline */
  --text-6xl: 3.75rem;    /* 60px — impact numbers */

  /* ── BORDER RADIUS ── */
  --radius-sm: 6px;       /* Buttons, badges */
  --radius-md: 10px;      /* Cards, inputs */
  --radius-lg: 16px;      /* Large cards, modals */
  --radius-xl: 24px;      /* Hero sections, featured cards */

  /* ── SHADOWS ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03);
  --shadow-book: 4px 4px 15px rgba(0, 0, 0, 0.15), 0 0 3px rgba(0, 0, 0, 0.05);
  --shadow-book-hover: 8px 8px 25px rgba(0, 0, 0, 0.2), 0 0 5px rgba(0, 0, 0, 0.08);

  /* ── TRANSITIONS ── */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

### Book Card — Premium Design

```tsx
// components/BookCard.tsx
// The signature element — every book displayed as a beautiful, tactile object

interface BookCardProps {
  book: {
    title: string;
    author: string;
    coverUrl: string | null;
    rating: number;
    ratingCount: number;
    contentType: string;
    formats: string[];
    viewCount: number;
    likeCount: number;
    slug: string;
    category: { name: string };
  };
  size?: 'compact' | 'standard' | 'featured';
  showReason?: string;
  priority?: boolean;
}

export function BookCard({ book, size = 'standard', showReason, priority }: BookCardProps) {
  const coverSize = size === 'compact' ? 'sm' : size === 'featured' ? 'lg' : 'md';

  return (
    <article className="group relative">
      <a
        href={`/book/${book.slug}`}
        className={`
          block rounded-xl transition-all
          ${size === 'featured'
            ? 'p-5 bg-[var(--surface)] shadow-md hover:shadow-xl'
            : 'p-3 hover:bg-[var(--surface)] hover:shadow-lg'
          }
          duration-300 ease-[var(--ease-out-expo)]
        `}
      >
        {/* Recommendation reason badge */}
        {showReason && (
          <p className="text-[11px] text-[var(--primary)] font-medium mb-2 tracking-wide uppercase">
            {showReason}
          </p>
        )}

        <div className={`flex ${size === 'featured' ? 'gap-5' : 'gap-3'}`}>
          {/* Book Cover with 3D depth effect */}
          <div className="relative flex-shrink-0">
            {/* Spine shadow (makes cover look 3D like a real book) */}
            <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-l
              bg-gradient-to-r from-black/20 to-transparent z-10" />

            {/* Page edge effect */}
            <div className="absolute -right-[2px] top-1 bottom-1 w-[4px]
              bg-gradient-to-l from-neutral-300 via-neutral-200 to-neutral-100
              dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-400
              rounded-r-sm" />

            <BookCover
              src={book.coverUrl}
              title={book.title}
              author={book.author}
              size={coverSize}
              priority={priority}
              className="relative z-[1] transition-transform duration-300
                group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-book-hover)]"
            />

            {/* Content type badge */}
            <span className={`
              absolute -top-2 -right-2 z-20 text-[10px] font-bold px-1.5 py-0.5
              rounded-full shadow-sm
              ${book.contentType === 'AUDIOBOOK'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : book.contentType === 'COMIC'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                : book.contentType === 'NOVEL'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }
            `}>
              {book.contentType === 'AUDIOBOOK' ? '🎧' :
               book.contentType === 'COMIC' ? '🦸' :
               book.contentType === 'NOVEL' ? '📖' :
               book.contentType === 'MAGAZINE' ? '📰' : '📚'}
            </span>
          </div>

          {/* Book Info */}
          <div className="flex flex-col justify-between min-w-0 flex-1">
            <div>
              <h3 className={`
                font-semibold text-[var(--text)] leading-snug line-clamp-2
                ${size === 'featured' ? 'text-lg' : 'text-sm'}
              `}>
                {book.title}
              </h3>

              <p className={`
                text-[var(--text-secondary)] mt-0.5 line-clamp-1
                ${size === 'featured' ? 'text-sm' : 'text-xs'}
              `}>
                {book.author}
              </p>

              {/* Rating */}
              {book.rating > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg key={star} className={`w-3 h-3 ${
                        star <= Math.round(book.rating)
                          ? 'text-amber-400'
                          : 'text-neutral-300 dark:text-neutral-600'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {book.rating.toFixed(1)} ({book.ratingCount.toLocaleString()})
                  </span>
                </div>
              )}
            </div>

            {/* Bottom: Formats + Stats */}
            <div className="mt-2">
              {/* Available formats */}
              <div className="flex flex-wrap gap-1">
                {book.formats.map(format => (
                  <span key={format} className="
                    text-[10px] font-medium px-1.5 py-0.5 rounded
                    bg-[var(--bg-secondary)] text-[var(--text-secondary)]
                  ">
                    {format}
                  </span>
                ))}
              </div>

              {/* View + like counts */}
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-0.5">
                  👁 {formatCount(book.viewCount)}
                </span>
                <span className="flex items-center gap-0.5">
                  ❤️ {formatCount(book.likeCount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </a>
    </article>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
```

### Book Grid Layouts (Responsive)

```tsx
// components/BookGrid.tsx
// Responsive grid that looks premium on every screen size

interface BookGridProps {
  books: any[];
  layout: 'grid' | 'list' | 'shelf' | 'carousel';
  columns?: number;
}

export function BookGrid({ books, layout, columns }: BookGridProps) {
  if (layout === 'shelf') {
    // BOOKSHELF LAYOUT — Books displayed like on a real shelf
    return (
      <div className="relative">
        {/* Shelf surface */}
        <div className="
          flex gap-4 overflow-x-auto pb-4 px-1 pt-1
          scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600
          snap-x snap-mandatory
        ">
          {books.map((book, i) => (
            <div key={book.id} className="snap-start flex-shrink-0">
              <BookCard book={book} size="standard" priority={i < 4} />
            </div>
          ))}
        </div>
        {/* Shelf shadow (bottom edge) */}
        <div className="h-[3px] bg-gradient-to-b from-neutral-200 to-transparent
          dark:from-neutral-700 rounded-full mx-4" />
      </div>
    );
  }

  if (layout === 'carousel') {
    // HORIZONTAL SCROLL CAROUSEL — For featured/trending sections
    return (
      <div className="relative group/carousel">
        <div className="
          flex gap-4 overflow-x-auto pb-2 px-1
          snap-x snap-mandatory scroll-smooth
          scrollbar-none
        " id="carousel">
          {books.map((book, i) => (
            <div key={book.id} className="snap-start flex-shrink-0 w-[200px] md:w-[240px]">
              <BookCard book={book} size="standard" priority={i < 5} />
            </div>
          ))}
        </div>

        {/* Scroll arrows (visible on hover) */}
        <button className="
          absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2
          w-10 h-10 rounded-full bg-white dark:bg-neutral-800
          shadow-lg flex items-center justify-center
          opacity-0 group-hover/carousel:opacity-100 transition-opacity
          hover:scale-110
        " onClick={() => scrollCarousel('left')}>
          ←
        </button>
        <button className="
          absolute right-0 top-1/2 -translate-y-1/2 translate-x-2
          w-10 h-10 rounded-full bg-white dark:bg-neutral-800
          shadow-lg flex items-center justify-center
          opacity-0 group-hover/carousel:opacity-100 transition-opacity
          hover:scale-110
        " onClick={() => scrollCarousel('right')}>
          →
        </button>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-2 w-8
          bg-gradient-to-r from-[var(--bg)] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-2 w-8
          bg-gradient-to-l from-[var(--bg)] to-transparent pointer-events-none" />
      </div>
    );
  }

  if (layout === 'list') {
    // LIST LAYOUT — Compact rows for search results and category browsing
    return (
      <div className="divide-y divide-[var(--border)]">
        {books.map((book, i) => (
          <div key={book.id} className="py-3">
            <BookCard book={book} size="compact" priority={i < 8} />
          </div>
        ))}
      </div>
    );
  }

  // GRID LAYOUT — Default, responsive card grid
  return (
    <div className={`
      grid gap-4
      grid-cols-2
      sm:grid-cols-3
      md:grid-cols-4
      lg:grid-cols-${columns || 5}
      xl:grid-cols-${columns || 6}
    `}>
      {books.map((book, i) => (
        <BookCard key={book.id} book={book} priority={i < 8} />
      ))}
    </div>
  );
}
```

### Responsive Breakpoints

```css
/* Tailwind config — responsive design that fits every device perfectly */

/*
  MOBILE (< 640px):
  - Single column feed
  - Book cards: cover + info stacked vertically
  - Bottom navigation bar
  - Full-width search bar
  - Touch-optimized tap targets (min 44x44px)

  TABLET (640px - 1024px):
  - 2-3 column grid
  - Side-by-side book cards
  - Collapsible sidebar navigation
  - Comfortable reading width

  DESKTOP (1024px - 1440px):
  - 4-5 column grid
  - Persistent sidebar
  - Two-panel layouts (category + books)
  - Hover interactions

  WIDE (> 1440px):
  - 6 column grid
  - Max content width 1400px (prevent overly wide lines)
  - Centered with generous margins
  - Large hero sections with visual impact
*/

/* Max content width — nothing stretches past this */
.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 640px) {
  .content-wrapper { padding: 0 var(--space-6); }
}

@media (min-width: 1024px) {
  .content-wrapper { padding: 0 var(--space-8); }
}
```

### Homepage — Premium Layout

```tsx
// app/page.tsx — Homepage that looks like a billion-dollar product

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        {/* Ambient gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10
            rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10
            rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="content-wrapper text-center">
          {/* Live counter */}
          <p className="text-[var(--primary)] font-mono text-sm tracking-widest mb-4">
            247,482 FREE BOOKS AND COUNTING
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text)]
            leading-tight max-w-3xl mx-auto">
            Every profession.{' '}
            <span className="text-transparent bg-clip-text
              bg-gradient-to-r from-blue-500 to-emerald-500">
              Every free book.
            </span>
            {' '}One place.
          </h1>

          <p className="mt-6 text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            The world's largest collection of free books, audiobooks, comics, and
            magazines — organized by career, searchable in seconds.
          </p>

          {/* Search bar — the centerpiece interaction */}
          <div className="mt-10 max-w-2xl mx-auto">
            <SearchBar />
          </div>

          {/* Quick category pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {topCategories.map(cat => (
              <a key={cat.slug} href={`/${cat.slug}`}
                className="px-4 py-2 rounded-full text-sm font-medium
                  bg-[var(--surface)] text-[var(--text-secondary)]
                  hover:bg-[var(--primary)] hover:text-white
                  transition-colors duration-200 shadow-sm">
                {cat.icon} {cat.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERSONALIZED FEED (or Trending for new users) ── */}
      <section className="content-wrapper py-12">
        <SectionHeader
          title="Trending this week"
          icon="🔥"
          action={{ label: 'See all', href: '/trending' }}
        />
        <BookGrid books={trendingBooks} layout="carousel" />
      </section>

      {/* ── RECENTLY ADDED ── */}
      <section className="content-wrapper py-12">
        <SectionHeader
          title="Just added"
          icon="✨"
          action={{ label: 'See all', href: '/new' }}
        />
        <BookGrid books={newBooks} layout="carousel" />
      </section>

      {/* ── BROWSE BY PROFESSION ── */}
      <section className="content-wrapper py-12">
        <SectionHeader title="Browse by profession" icon="🧭" />
        <CategoryGrid categories={allCategories} />
      </section>

      {/* ── FREE AUDIOBOOKS ── */}
      <section className="content-wrapper py-12">
        <SectionHeader
          title="Free audiobooks"
          icon="🎧"
          action={{ label: 'Browse all', href: '/audiobooks' }}
        />
        <BookGrid books={audiobooks} layout="shelf" />
      </section>

      {/* ── CURATED COLLECTIONS ── */}
      <section className="content-wrapper py-12">
        <SectionHeader title="Curated collections" icon="📚" />
        <CollectionGrid collections={featuredCollections} />
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[var(--bg-secondary)] py-16 mt-12">
        <div className="content-wrapper">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatBlock number="247K+" label="Free Books" />
            <StatBlock number="45K+" label="Audiobooks" />
            <StatBlock number="500+" label="Professions" />
            <StatBlock number="40+" label="Sources" />
          </div>
        </div>
      </section>

    </main>
  );
}

// Section header component
function SectionHeader({ title, icon, action }: {
  title: string; icon: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-[var(--text)]">
        <span className="mr-2">{icon}</span>{title}
      </h2>
      {action && (
        <a href={action.href}
          className="text-sm text-[var(--primary)] hover:underline font-medium">
          {action.label} →
        </a>
      )}
    </div>
  );
}

// Stat block
function StatBlock({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="text-3xl md:text-4xl font-bold font-mono
        text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">
        {number}
      </p>
      <p className="text-sm text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}
```

### Category Grid — Visual Browsing

```tsx
// components/CategoryGrid.tsx

function CategoryGrid({ categories }: { categories: Category[] }) {
  // Icons and gradient pairs per top-level category
  const categoryStyles: Record<string, { icon: string; gradient: string }> = {
    'Technology':    { icon: '💻', gradient: 'from-blue-500/20 to-cyan-500/20' },
    'Engineering':   { icon: '⚙️', gradient: 'from-orange-500/20 to-amber-500/20' },
    'Medicine':      { icon: '⚕️', gradient: 'from-red-500/20 to-rose-500/20' },
    'Business':      { icon: '📊', gradient: 'from-emerald-500/20 to-green-500/20' },
    'Law':           { icon: '⚖️', gradient: 'from-indigo-500/20 to-violet-500/20' },
    'Sciences':      { icon: '🔬', gradient: 'from-purple-500/20 to-fuchsia-500/20' },
    'Arts':          { icon: '🎨', gradient: 'from-pink-500/20 to-rose-500/20' },
    'Maritime':      { icon: '🚢', gradient: 'from-teal-500/20 to-cyan-500/20' },
    'Education':     { icon: '📚', gradient: 'from-yellow-500/20 to-amber-500/20' },
    'Trades':        { icon: '🔧', gradient: 'from-stone-500/20 to-zinc-500/20' },
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {categories.map(cat => {
        const style = categoryStyles[cat.name] || { icon: '📖', gradient: 'from-gray-500/20 to-gray-500/20' };
        return (
          <a
            key={cat.id}
            href={`/${cat.slug}`}
            className={`
              relative overflow-hidden rounded-xl p-5
              bg-gradient-to-br ${style.gradient}
              hover:shadow-lg hover:-translate-y-0.5
              transition-all duration-300
              group
            `}
          >
            <span className="text-3xl block mb-2">{style.icon}</span>
            <h3 className="font-semibold text-sm text-[var(--text)]">{cat.name}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {cat._count.books.toLocaleString()} free books
            </p>
            <span className="absolute bottom-2 right-3 text-[var(--primary)] text-sm
              opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </a>
        );
      })}
    </div>
  );
}
```

### Responsive Navigation

```
MOBILE (< 768px):
┌──────────────────────────────────────┐
│  [≡]  ANYFREEBOOK        [🔍] [👤]  │  ← Top bar
└──────────────────────────────────────┘
│                                      │
│         (Page content)               │
│                                      │
┌──────────────────────────────────────┐
│  🏠    🔍    📚    🎧    👤         │  ← Bottom tab bar (fixed)
│ Home  Search  Lib  Audio  Profile    │
└──────────────────────────────────────┘

TABLET (768px - 1024px):
┌──────────────────────────────────────┐
│  ANYFREEBOOK  [Search...] [📚] [👤] │
├──────────────────────────────────────┤
│  Home │ Explore │ Trending │ New     │  ← Horizontal nav
├──────────────────────────────────────┤
│                                      │
│          (Page content)              │
│                                      │
└──────────────────────────────────────┘

DESKTOP (> 1024px):
┌──────────────────────────────────────────────────────┐
│  ANYFREEBOOK   Home  Explore  Trending  Blog         │
│                [  🔍 Search 247,000+ free books... ] │
│                                         [📚] [🔔] [👤]│
├──────────────────────────────────────────────────────┤
│                                                      │
│                  (Page content)                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## SECTION 6: VISUAL QUALITY CHECKLIST

Every page on ANYFREEBOOK must pass this quality bar before shipping.

```
TYPOGRAPHY
☐ Headlines use Plus Jakarta Sans 700 (or chosen display face)
☐ Body text uses Inter 400 at 16px minimum
☐ Line height is 1.6–1.8 for body text
☐ Maximum content line width is 65–75 characters
☐ Hierarchy is clear: H1 > H2 > H3 > body > caption
☐ No orphaned words on headlines (use &nbsp; or max-width)

SPACING
☐ Consistent spacing using the 4px grid
☐ Sections separated by at least 48px
☐ Cards have at least 12px internal padding
☐ Nothing touches the viewport edge on mobile (min 16px margin)

IMAGES
☐ All book covers have consistent aspect ratio (2:3)
☐ Missing covers get beautiful gradient placeholders (not broken image icons)
☐ All images use WebP/AVIF with quality 80
☐ Above-the-fold images use priority loading
☐ All images have descriptive alt text
☐ Blur placeholders shown during load (no layout shift)

INTERACTION
☐ All clickable elements have hover states
☐ Minimum tap target size: 44x44px on mobile
☐ Smooth transitions on all state changes (300ms ease-out)
☐ Loading states (skeleton loaders, not spinners) for async content
☐ No content jumps during page load (CLS < 0.1)

COLOR & CONTRAST
☐ WCAG AA contrast ratio on all text (4.5:1 body, 3:1 large)
☐ Theme toggle works instantly without flash
☐ Custom gradient themes maintain text readability
☐ Interactive elements have visible focus indicators

RESPONSIVE
☐ Tested on 375px width (iPhone SE — smallest common screen)
☐ Tested on 768px width (iPad)
☐ Tested on 1440px width (laptop)
☐ Tested on 1920px width (desktop)
☐ No horizontal scroll on any breakpoint
☐ Text remains readable without zooming on mobile
☐ Touch scrolling is smooth with snap points
```

---

*ANYFREEBOOK: Where the world's free knowledge is organized, optimized, and displayed with the care of a luxury brand — because free doesn't mean cheap.*
