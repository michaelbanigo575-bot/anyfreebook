/**
 * The anti-ban policy, as code rather than as good intentions.
 *
 * Reddit bans accounts for behaviour that looks like spam. The rules that
 * actually trigger it are boring and mechanical: posting too often, posting
 * the same shape of thing everywhere, appearing without a human in the loop,
 * and following links you have no business following.
 *
 * So this module makes the safe behaviour the only behaviour the code can
 * express. Every limit here is enforced at the point of action, not left to
 * whoever runs it today.
 */

import type { RedditProduct } from './types';

/** Hard cap on how many distinct subreddits may be read in one day. */
export const MAX_SUBREDDITS_PER_DAY = 5;

/** Hard cap on how many distinct subreddits may be read for one product in one day. */
export const MAX_SUBREDDITS_PER_PRODUCT_PER_DAY = 3;

/** Minimum gap between two Reddit requests, in milliseconds. */
export const MIN_REQUEST_INTERVAL_MS = 60_000;

/** Reddit's own guidance: no more than 100 reads per minute, and identify yourself. */
export const USER_AGENT =
  'web:anyfreebook.com:0.1 (read-only community discovery; operator-reviewed replies; contact: anyfreebook.com)';

/**
 * The ratio the brief calls for: nine parts answer to one part product.
 *
 * Counted on words, not characters, and the product mention must be the last
 * thing in the reply. A reply that fails this is not drafted at all.
 */
export const MIN_VALUE_RATIO = 9;

/** Shortest answer section we will consider real. Below this it is a bare link. */
export const MIN_ANSWER_WORDS = 60;

/** Longest reply we will write. Reddit's own limit for a top-level comment is 10k. */
export const MAX_REPLY_WORDS = 900;

/**
 * Every product mention carries this. It is not optional and the draft
 * builder refuses to produce a reply without it.
 */
export function disclosureFor(product: RedditProduct, options: { allowUrl?: boolean } = {}): string {
  const allowUrl = options.allowUrl ?? true;
  if (product === 'anyfreebook') {
    return allowUrl
      ? 'Full disclosure: I built Anyfreebook (https://anyfreebook.com).'
      : 'Full disclosure: I built Anyfreebook, the book-search engine behind this reply.';
  }
  return allowUrl
    ? 'Full disclosure: I built AfriStudio (https://afristudio.org).'
    : 'Full disclosure: I built AfriStudio, the narration tool behind this reply.';
}

/** Words that count as "talking about our product" for the ratio check. */
const MENTION_MARKERS = [
  'anyfreebook',
  'afristudio',
  'https://anyfreebook.com',
  'https://afristudio.org',
  'i built',
  'full disclosure',
  'our site',
  'our tool',
];

/** Count the words in a section of a reply. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.trim().length > 0).length;
}

/**
 * How much of the reply is about us.
 *
 * Counts sentences, not markers: a sentence that says "Full disclosure: I
 * built Anyfreebook (https://anyfreebook.com)" mentions us once, even though
 * three separate markers appear in it. Counting the markers separately made
 * a six-word mention look like thirty words and sank every ratio.
 */
export function countMentionWords(text: string): number {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let mentions = 0;
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (MENTION_MARKERS.some((marker) => lower.includes(marker))) {
      mentions += wordCount(sentence);
    }
  }
  return mentions;
}

/** The answer-to-mention ratio of a whole reply. */
export function valueRatioOf(answerBody: string, mentionBody: string): number {
  const answer = wordCount(answerBody);
  const mention = Math.max(1, countMentionWords(mentionBody));
  return Math.round((answer / mention) * 100) / 100;
}

export interface PolicyCheck {
  ok: boolean;
  problems: string[];
}

/**
 * The gate every draft passes before it can be shown to the operator.
 *
 * A draft that fails is still saved (so the operator can see why), but it is
 * marked not-ready and cannot be approved.
 */
export function checkDraftPolicy(draft: {
  answerBody: string;
  mentionBody: string;
  disclosure: string;
  subreddit: string;
  linksAllowed?: boolean | null;
}): PolicyCheck {
  const problems: string[] = [];

  const answerWords = wordCount(draft.answerBody);
  if (answerWords < MIN_ANSWER_WORDS) {
    problems.push(`Answer is ${answerWords} words; ${MIN_ANSWER_WORDS} minimum. A reply that short is a link, not an answer.`);
  }

  const mentionWords = wordCount(draft.mentionBody);
  if (mentionWords > 45) {
    problems.push(`Product mention is ${mentionWords} words; keep it under 45 so the answer dominates.`);
  }

  const ratio = valueRatioOf(draft.answerBody, draft.mentionBody);
  if (ratio < MIN_VALUE_RATIO) {
    problems.push(`Value ratio is ${ratio}:1; ${MIN_VALUE_RATIO}:1 minimum required.`);
  }

  const disclosure = (draft.disclosure ?? '').trim();
  if (!disclosure) {
    problems.push('No full-disclosure line. A reply that mentions us without disclosing who we are is astroturfing.');
  } else if (!/full disclosure/i.test(disclosure)) {
    problems.push('Disclosure does not contain the words "Full disclosure".');
  }

  const totalWords = answerWords + mentionWords;
  if (totalWords > MAX_REPLY_WORDS) {
    problems.push(`Reply is ${totalWords} words; ${MAX_REPLY_WORDS} maximum.`);
  }

  if (draft.linksAllowed === false && /https?:\/\//.test(draft.mentionBody)) {
    problems.push(`${draft.subreddit} does not allow links, but the mention contains a URL.`);
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Rules the operator must tick off before submitting.
 *
 * These are deliberately conservative: a rule we have not verified is treated
 * as "do not post until you have checked".
 */
export function ruleChecksFor(input: {
  subreddit: string;
  linksAllowed: boolean | null;
  selfPromoThread: string | null;
  minAccountAgeDays: number | null;
  minKarma: number | null;
  rulesVerifiedAt: string | null;
  hasLink: boolean;
}): string[] {
  const checks: string[] = [];

  if (!input.rulesVerifiedAt) {
    checks.push(`Read r/${input.subreddit}'s current rules before posting — this system has not verified them yet.`);
  }

  if (input.linksAllowed === false) {
    checks.push(`r/${input.subreddit} does not allow links: remove the URL and reply with the answer only.`);
  } else if (input.linksAllowed === null) {
    checks.push(`Confirm whether r/${input.subreddit} allows links.`);
  }

  if (input.selfPromoThread) {
    checks.push(`Post in ${input.selfPromoThread} instead of the main feed, if the reply mentions us.`);
  }

  if (input.minAccountAgeDays !== null) {
    checks.push(`The reply account must be at least ${input.minAccountAgeDays} days old.`);
  }

  if (input.minKarma !== null) {
    checks.push(`The reply account needs at least ${input.minKarma} karma.`);
  }

  if (input.hasLink) {
    checks.push('The reply contains a link — make sure the account has posted non-promotional comments first.');
  }

  checks.push('Read the thread again before posting. If the answer no longer fits, do not post.');

  return checks;
}
