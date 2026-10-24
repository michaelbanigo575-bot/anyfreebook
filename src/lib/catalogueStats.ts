/**
 * The catalogue size ANYFREEBOOK advertises, in one place.
 *
 * Every number here was measured against the live source on 2026-10-24. The
 * claim on the site must never exceed what the smallest source that supports
 * it actually returns — the honest headline is the one that survives a reader
 * checking the source, not the biggest number we can find.
 *
 *   Internet Archive, collection:internetarchivebooks   5,757,688  scanned books
 *   Project Gutenberg, gutendex count                      79,666  ebooks
 *   PubMed Central, open-access subset                  8,331,584  articles
 *   DOAJ article index                                 13,842,528  articles
 *   Gutenberg + Internet Archive books                 5,837,354  books
 *
 * Two different numbers get quoted on the site and they are not the same
 * thing, so keep them apart:
 *
 *   liveBooks      what the live fan-out can reach — millions, and it moves.
 *   curatedBooks   what we hand-picked in src/lib/data.ts — hundreds, and it
 *                  is what powers the category and book detail pages.
 *
 * `liveBooks` is deliberately rounded down to "5 million+" because the
 * Internet Archive alone held 5,757,688 scanned books on the measurement date
 * and that figure drifts with the archive.
 *
 * Values are strings because they land in <StatBlock number="..." /> and in
 * metadata titles, where a number would be a type error.
 */
export const CATALOGUE = {
  /** Headline reach: books and papers across the seven live sources. */
  liveBooks: '5 million+',

  /** Short form for stat tiles and badges. */
  liveBooksShort: '5M+',

  /** Hand-curated titles in src/lib/data.ts (actually 258). */
  curatedBooks: '258',

  /** 34 top-level subjects + 207 world categories. */
  categories: '241',

  /** 34 top-level subjects + 111 deep subject shelves. */
  fields: '50+',

  /** The seven sources the fan-out searches. */
  sources: '7',

  /** Project Gutenberg's catalogue, via gutendex. */
  gutenbergTitles: '79K+',

  /** Named once so the count and the name never drift apart. */
  sourceNames: 'Open Library, Project Gutenberg, Google Books, the Internet Archive, LibriVox, PubMed Central and DOAJ',
} as const;

/** One sentence, used wherever the site explains where the books come from. */
export const CATALOGUE_SENTENCE =
  `searches ${CATALOGUE.liveBooks} free books and papers live across ${CATALOGUE.sources} open-access sources — ` +
  `${CATALOGUE.sourceNames} — and curates ${CATALOGUE.curatedBooks} titles across ${CATALOGUE.categories} categories.`;
