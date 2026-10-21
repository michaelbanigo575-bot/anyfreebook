import type { Book } from './data';
import type { SourceTier } from './api/resolveSource';

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ANYFREEBOOK',
    alternateName: 'Any Free Book',
    url: 'https://anyfreebook.com',
    description: "A free book aggregator. Curated books plus live results from 7 open-access sources.",
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

export function bookSchema(book: Book, tier: SourceTier = 'download') {
  const isFreeToDownload = tier === 'download';
  const claim = isFreeToDownload ? 'Free Download' : tier === 'borrow' ? 'Available to Borrow Free' : 'Where to Find It Free';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    // The headline must never claim "Free Download" unless we verified a
    // public-domain full text. This string is indexed by search engines.
    headline: `${book.title} — ${claim}`,
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
  };

  // Only advertise a free price when a free copy is actually verified.
  // For 'borrow' (Controlled Digital Lending) and 'unverified' we emit no Offer,
  // because price:0 + InStock tells Google the book is a free download.
  if (isFreeToDownload) {
    schema.offers = {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `https://anyfreebook.com/book/${book.slug}`,
    };
  }

  if (book.rating > 0 && book.ratingCount > 0) {
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
  const cat = category.toLowerCase();
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Where can I find free ${cat} books?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `ANYFREEBOOK searches Open Library, the Internet Archive and Google Books live for ${cat}.${
            count > 0 ? ` ${count.toLocaleString()}+ titles matched on Open Library,` : ''
          } and every curated pick links straight to its source, with a badge showing whether it is verified free to download.`,
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
        // No Offer here on purpose: collections mix public-domain works with
        // in-copyright textbooks, so a blanket price:0 would be a false claim.
        // Per-book availability is expressed by each book's own page schema.
      },
    })),
  };
}
