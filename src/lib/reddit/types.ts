/**
 * Reddit discovery + drafting — types.
 *
 * The system never posts. It discovers threads and drafts replies; a human
 * reads the draft, checks the subreddit's current rules, and submits it by
 * hand. There is deliberately no "post comment" code path anywhere in this
 * module, and no API route that submits one.
 */

export type RedditProduct = 'anyfreebook' | 'afristudio';

/** A subreddit we watch, with the rules we know about it. */
export interface RedditTarget {
  id?: string;
  product: RedditProduct;
  subreddit: string;
  /** Why we watch it — shown to the operator, never to Reddit. */
  purpose: string;
  /** Phrases that mark a thread as high-intent for this product. */
  intentKeywords: string[];
  /** Does the subreddit allow links in a reply? null = not verified yet. */
  linksAllowed: boolean | null;
  /** Does it have a weekly/self-promo megathread? null = not verified yet. */
  selfPromoThread: string | null;
  /** Minimum account age in days for the reply account, null = unknown. */
  minAccountAgeDays: number | null;
  /** Minimum karma for the reply account, null = unknown. */
  minKarma: number | null;
  /** When a human last confirmed the rules above. Null means "unverified". */
  rulesVerifiedAt: string | null;
  active: boolean;
  lastFetchedAt?: string | null;
}

/** A thread we found. */
export interface RedditPost {
  id?: string;
  targetId?: string | null;
  product: RedditProduct;
  subreddit: string;
  redditId: string;
  title: string;
  body: string;
  author: string;
  url: string;
  permalink: string;
  createdUtc: string;
  score: number;
  numComments: number;
  /** 0-100. How well the thread matches what the product actually helps with. */
  intentScore: number;
  /** Which keywords fired, for the operator to sanity-check the match. */
  intentSignals: string[];
  /** new | drafted | approved | skipped | published */
  status: RedditPostStatus;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export type RedditPostStatus = 'new' | 'drafted' | 'approved' | 'skipped' | 'published';

/** A drafted reply, waiting for a human. */
export interface RedditDraft {
  id?: string;
  postId?: string | null;
  product: RedditProduct;
  subreddit: string;
  /** The full reply text, as it should be pasted. */
  body: string;
  /** The part that answers the question. Must come first. */
  answerBody: string;
  /** The part that mentions our product. Must come last. */
  mentionBody: string;
  /** Mandatory disclosure sentence. */
  disclosure: string;
  /** answer words : mention words. Must be at least 9. */
  valueRatio: number;
  /** Blog post the reply links to, if any. Null = link-free reply. */
  linkedArticleSlug: string | null;
  linkedArticleUrl: string | null;
  /** Rules the operator must satisfy before submitting. */
  ruleChecks: string[];
  /** draft | approved | submitted | discarded */
  status: RedditDraftStatus;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
}

export type RedditDraftStatus = 'draft' | 'approved' | 'submitted' | 'discarded';

/** Raw shape of the Reddit listing endpoint (read-only). */
export interface RedditListingChild {
  kind: string;
  data: {
    id: string;
    title?: string;
    selftext?: string;
    author?: string;
    url?: string;
    permalink?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    over_18?: boolean;
    stickied?: boolean;
    is_self?: boolean;
    domain?: string;
  };
}
