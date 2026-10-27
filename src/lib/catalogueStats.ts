/**
 * The catalogue size ANYFREEBOOK advertises, in one place.
 *
 * Every number here was measured against the live source on 2026-10-25. The
 * claim on the site must never exceed what the smallest source that supports
 * it actually returns — the honest headline is the one that survives a reader
 * checking the source, not the biggest number we can find.
 *
 *   Internet Archive, collection:internetarchivebooks   5,757,717  scanned books
 *   Internet Archive, collection:opensource (texts)     1,267,746  community books
 *   Internet Archive, collection:biodiversity              286,333  scientific books
 *   Project Gutenberg, gutendex count                       79,666  ebooks
 *   ---------------------------------------------------------------------
 *   books the live fan-out can reach                    7,391,462
 *
 *   PubMed Central, open-access subset                  8,331,584  articles
 *   DOAJ article index                                 13,842,528  articles
 *   Internet Archive, mediatype:texts (all)            52,879,297  any text
 *
 * The IA sets are counted as distinct identifiers: the open-source and
 * biodiversity collections were queried with "AND NOT
 * collection:internetarchivebooks", so nothing is counted twice.
 *
 * Two different numbers get quoted on the site and they are not the same
 * thing, so keep them apart:
 *
 *   liveBooks      what the live fan-out can reach — millions, and it moves.
 *   curatedBooks   what we hand-picked in src/lib/data.ts — hundreds, and it
 *                  is what powers the category and book detail pages.
 *
 * "7 million+" is deliberately conservative: the Internet Archive alone holds
 * 52.9M text items, of which 7.3M are books in the sets above.
 *
 * Values are strings because they land in <StatBlock number="..." /> and in
 * metadata titles, where a number would be a type error.
 */

import { SOURCE_REGISTRY } from './api/sources';

export const CATALOGUE = {
  /** Headline reach: books and papers across the live sources. */
  liveBooks: '7 million+',

  /** Short form for stat tiles and badges. */
  liveBooksShort: '7M+',

  /** Hand-curated titles in src/lib/data.ts (actually 258). */
  curatedBooks: '258',

  /** 34 top-level subjects + 207 world categories. */
  categories: '241',

  /** 34 top-level subjects + 111 deep subject shelves. */
  fields: '50+',

  /** The live sources the fan-out searches. Kept in step with SOURCE_REGISTRY. */
  sources: String(SOURCE_REGISTRY.length),

  /** Project Gutenberg's catalogue, via gutendex. */
  gutenbergTitles: '79K+',

  /** Named once so the count and the name never drift apart. */
  sourceNames: SOURCE_REGISTRY.map(s => s.label).join(', '),
} as const;

/** One sentence, used wherever the site explains where the books come from. */
export const CATALOGUE_SENTENCE =
  `searches ${CATALOGUE.liveBooks} free books and papers live across ${CATALOGUE.sources} open-access sources — ` +
  `${CATALOGUE.sourceNames} — and curates ${CATALOGUE.curatedBooks} titles across ${CATALOGUE.categories} categories.`;
