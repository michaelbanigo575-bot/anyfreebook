import type { Book } from './data';

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ANYFREEBOOK',
    alternateName: 'Any Free Book',
    url: 'https://anyfreebook.com',
    description: "The world's largest free book aggregator. 1,700,000+ free books, audiobooks, comics, and magazines across 500+ professions.",
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

export function bookSchema(book: Book) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    headline: `${book.title} — Free Download`,
    author: { '@type': 'Person', name: book.author },
    description: book.description,
    url: `https://anyfreebook.com/book/${book.slug}`,
    image: book.coverUrl,
    inLanguage: book.language || 'en',
    genre: book.category?.name,
    bookFormat: 'https://schema.org/EBook',
    numberOfPages: book.pageCount || undefined,
    datePublished: book.publishYear ? `${book.publishYear}` : undefined,
    isbn: book.isbn || undefined,
    publisher: book.publisher ? { '@type': 'Organization', name: book.publisher } : undefined,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `https://anyfreebook.com/book/${book.slug}`,
    },
  };

  if (book.rating && book.ratingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: book.rating.toFixed(1),
      ratingCount: book.ratingCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}

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
          text: `ANYFREEBOOK has ${count.toLocaleString()}+ free ${category.toLowerCase()} books aggregated from 40+ open-access sources including Open Library, MIT OCW, OpenStax, and Project Gutenberg.`,
        },
      },
      {
        '@type': 'Question',
        name: `Are these ${category.toLowerCase()} books really free and legal?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Every book on ANYFREEBOOK comes from verified legal sources — public domain works, Creative Commons publications, government repositories, and open-access academic libraries.',
        },
      },
      {
        '@type': 'Question',
        name: `Can I download free ${category.toLowerCase()} books as PDF?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Most ${category.toLowerCase()} books on ANYFREEBOOK are available in multiple formats including PDF, EPUB, and plain text. Some also have free audiobook versions.`,
        },
      },
    ],
  };
}

/** Site-wide FAQPage schema for /faq — distinct from the per-category faqSchema above. */
export function siteFaqSchema(qa: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

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

export function collectionSchema(title: string, books: Book[]) {
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
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    })),
  };
}
