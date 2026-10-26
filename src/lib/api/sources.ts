/**
 * The source registry.
 *
 * One list of what every source is, what it can give you and what tier it
 * produces. The API serves it at /api/v1/sources and the developer page
 * renders it, so the documentation cannot drift away from the code the way a
 * hand-written table of sources does.
 */

export type SourceKind = 'books' | 'papers' | 'textbooks' | 'classics' | 'audiobooks';

export interface SourceDescriptor {
  id: string;
  label: string;
  kind: SourceKind;
  /** What it is, in a sentence. */
  description: string;
  /** The upstream's own home page. */
  homepage: string;
  /** The tier its results carry. */
  tier: 'download' | 'borrow' | 'unverified';
  /** True when the result carries a file you can fetch. */
  providesFiles: boolean;
  /** How many titles it holds, where the upstream says so. */
  catalogueSize?: string;
  /** True when the source needs a key of its own. */
  needsKey?: boolean;
  /** A licence that matters for using the results. */
  licence?: string;
}

export const SOURCE_REGISTRY: SourceDescriptor[] = [
  {
    id: 'gutenberg',
    label: 'Project Gutenberg',
    kind: 'books',
    description:
      'The largest library of public-domain ebooks. Every ebook has a plain-text, EPUB and HTML edition, so a title matched here is a file you can download right now.',
    homepage: 'https://www.gutenberg.org',
    tier: 'download',
    providesFiles: true,
    catalogueSize: '79,666 ebooks',
    licence: 'Public domain in the United States',
  },
  {
    id: 'archive',
    label: 'Internet Archive',
    kind: 'books',
    description:
      'Over 5.7 million scanned books. Most are downloadable; a large lending collection is borrow-only, and the tier says which.',
    homepage: 'https://archive.org',
    tier: 'download',
    providesFiles: true,
    catalogueSize: '5,757,717 scanned books',
    licence: 'Per item — public domain, borrow-only, or open access',
  },
  {
    id: 'openlibrary',
    label: 'Open Library',
    kind: 'books',
    description:
      'The catalogue layer: what exists, and which edition of it is free. It is the best place to check a title before you search for a copy.',
    homepage: 'https://openlibrary.org',
    tier: 'unverified',
    providesFiles: false,
    catalogueSize: 'Tens of millions of works',
    licence: 'Varies by edition',
  },
  {
    id: 'googlebooks',
    label: 'Google Books',
    kind: 'books',
    description:
      'A catalogue of books, some of them free to read. A record here is not a confirmed download, so the tier stays unverified.',
    homepage: 'https://books.google.com',
    tier: 'unverified',
    providesFiles: false,
    licence: 'Varies by title',
  },
  {
    id: 'librivox',
    label: 'LibriVox',
    kind: 'audiobooks',
    description:
      'Public-domain books read by volunteers, as free chapter files. Not included in a website search — an audiobook is rarely what someone typing a book title wants.',
    homepage: 'https://librivox.org',
    tier: 'download',
    providesFiles: true,
    licence: 'Public domain recordings',
  },
  {
    id: 'pubmed',
    label: 'PubMed Central',
    kind: 'papers',
    description:
      'The open-access subset of the biomedical literature, free as PDF.',
    homepage: 'https://www.ncbi.nlm.nih.gov/pmc',
    tier: 'download',
    providesFiles: true,
    catalogueSize: '8,331,584 open-access articles',
    licence: 'Varies — many CC BY',
  },
  {
    id: 'doaj',
    label: 'DOAJ',
    kind: 'papers',
    description:
      'The Directory of Open Access Journals: peer-reviewed journals that are free to read and download.',
    homepage: 'https://doaj.org',
    tier: 'download',
    providesFiles: true,
    catalogueSize: '13,842,528 articles',
    licence: 'Creative Commons, per journal',
  },
  {
    id: 'openalex',
    label: 'OpenAlex',
    kind: 'papers',
    description:
      'An index of scholarly works and their open-access copies. Only works marked open access are returned, so a paywalled paper never appears as free.',
    homepage: 'https://openalex.org',
    tier: 'download',
    providesFiles: true,
    catalogueSize: '250 million works; 1,248,862 open access',
    licence: 'Varies per work',
  },
  {
    id: 'zenodo',
    label: 'Zenodo',
    kind: 'papers',
    description:
      'The CERN research repository. A record carries its licence and a direct file, so the tier can be stated rather than guessed.',
    homepage: 'https://zenodo.org',
    tier: 'download',
    providesFiles: true,
    catalogueSize: 'Tens of millions of open outputs',
    licence: 'Stated per record — CC BY, CC0, and others',
  },
  {
    id: 'wikisource',
    label: 'Wikisource',
    kind: 'classics',
    description:
      'Public-domain texts in every language that has an edition. Each page renders to a PDF, and language categories on the site search the edition for their own language.',
    homepage: 'https://wikisource.org',
    tier: 'download',
    providesFiles: true,
    licence: 'Public domain',
  },
  {
    id: 'europeana',
    label: 'Europeana',
    kind: 'books',
    description:
      'The European Union aggregator of museums, archives and university libraries. Only openly licensed records are returned.',
    homepage: 'https://www.europeana.eu',
    tier: 'download',
    providesFiles: false,
    licence: 'Creative Commons or public domain, per item',
    needsKey: true,
  },
  {
    id: 'otl',
    label: 'Open Textbook Library',
    kind: 'textbooks',
    description:
      'Peer-reviewed open textbooks, with the licence, the publisher and the formats stated on the record.',
    homepage: 'https://open.umn.edu/opentextbooks',
    tier: 'download',
    providesFiles: true,
    catalogueSize: '2,039 textbooks',
    licence: 'Stated per book — CC BY, CC BY-NC-SA, GNU FDL and others',
  },
];

/** The catalogue we curate ourselves, as opposed to the live sources. */
export const LOCAL_CATALOGUE = {
  id: 'local',
  label: 'ANYFREEBOOK',
  kind: 'books' as const,
  description:
    'The hand-picked catalogue behind the category pages and the book detail pages.',
  homepage: 'https://anyfreebook.com',
  tier: 'unverified' as const,
  providesFiles: false,
  catalogueSize: '258 books across 241 categories',
  licence: 'Varies per book',
};
