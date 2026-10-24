/**
 * Read-only Reddit discovery.
 *
 * This module only ever calls GET on public listing endpoints. There is no
 * comment, vote, message or submit function here, and there is not going to
 * be one — the reply is written by a human and pasted in by hand.
 *
 * Reddit blocks datacenter IPs on the JSON endpoints, so this usually runs on
 * the operator's own machine (scripts/reddit-discover.mjs) rather than from
 * the deployed site.
 */

import type { RedditListingChild, RedditPost, RedditTarget } from './types.ts';
import { MIN_REQUEST_INTERVAL_MS, USER_AGENT } from './policy.ts';

let lastRequestAt = 0;

/** Enforce the gap between requests, so a loop can never hammer Reddit. */
async function waitForTurn(): Promise<void> {
  const since = Date.now() - lastRequestAt;
  if (since < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - since));
  }
  lastRequestAt = Date.now();
}

export interface DiscoveryResult {
  target: RedditTarget;
  posts: RedditPost[];
  error?: string;
}

/**
 * Score how well a thread matches what the product actually helps with.
 *
 * A keyword match alone is not enough — "free" in a thread about freeBSD is
 * not a thread about free books. The score weights a title hit above a body
 * hit, and a question-shaped title above a statement.
 */
export function scoreIntent(
  title: string,
  body: string,
  keywords: string[]
): { score: number; signals: string[] } {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  const signals: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    const k = keyword.toLowerCase();
    const inTitle = t.includes(k);
    const inBody = b.includes(k);
    if (inTitle) {
      score += 25;
      signals.push(`title: ${k}`);
    } else if (inBody) {
      score += 8;
      signals.push(`body: ${k}`);
    }
  }

  // A question is what we can actually answer.
  if (/\?|how do i|how can i|where can i|anyone know|looking for|need|help/.test(t)) {
    score += 15;
    signals.push('question-shaped');
  }

  // "Look at this" is not a request for a tool.
  if (/^\s*(look|found|sharing|my|built|made|i made|check out)/.test(t)) {
    score -= 20;
    signals.push('show-and-tell');
  }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

/** Threads older than this are not "recent" and are not worth a reply. */
export const MAX_AGE_HOURS = 48;

/**
 * Fetch the newest threads from one subreddit. Read-only.
 */
export async function fetchSubreddit(
  target: RedditTarget,
  options: { limit?: number; now?: number } = {}
): Promise<DiscoveryResult> {
  const limit = Math.min(options.limit ?? 25, 100);
  const now = options.now ?? Date.now();

  await waitForTurn();

  const url = `https://www.reddit.com/r/${target.subreddit}/new.json?limit=${limit}&raw_json=1`;

  let payload: { data?: { children?: RedditListingChild[] } };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return {
        target,
        posts: [],
        error: `reddit responded ${res.status}${res.status === 403 ? ' (blocked — run this from a machine Reddit does not block, or set up a Reddit app token)' : ''}`,
      };
    }
    payload = await res.json();
  } catch (err) {
    return { target, posts: [], error: err instanceof Error ? err.message : 'request failed' };
  }

  const posts: RedditPost[] = [];

  for (const child of payload.data?.children ?? []) {
    if (child.kind !== 't3') continue;
    const d = child.data;

    // Skip stickied announcements and anything with adult content.
    if (d.stickied || d.over_18) continue;

    const createdMs = (d.created_utc ?? 0) * 1000;
    if (!createdMs) continue;
    const ageHours = (now - createdMs) / 3_600_000;
    if (ageHours > MAX_AGE_HOURS) continue;

    const title = d.title ?? '';
    const body = d.selftext ?? '';
    const { score, signals } = scoreIntent(title, body, target.intentKeywords);

    // Below the floor it is not a thread we can add value to.
    if (score < 30) continue;

    posts.push({
      targetId: target.id ?? null,
      product: target.product,
      subreddit: target.subreddit,
      redditId: d.id,
      title,
      body,
      author: d.author ?? '[deleted]',
      url: `https://www.reddit.com${d.permalink ?? ''}`,
      permalink: d.permalink ?? '',
      createdUtc: new Date(createdMs).toISOString(),
      score: d.score ?? 0,
      numComments: d.num_comments ?? 0,
      intentScore: score,
      intentSignals: signals,
      status: 'new',
    });
  }

  posts.sort((a, b) => b.intentScore - a.intentScore);
  return { target, posts };
}

/**
 * Fetch several subreddits, respecting the daily caps.
 *
 * `allowedToday` is how many distinct subreddits have already been read
 * today. It is passed in rather than counted here so the cap survives a
 * restart of the process — the authoritative count lives in the database.
 */
export async function discover(
  targets: RedditTarget[],
  options: { allowedToday?: number; perProductAllowed?: number; now?: number } = {}
): Promise<DiscoveryResult[]> {
  const maxTotal = options.allowedToday ?? 5;
  const maxPerProduct = options.perProductAllowed ?? 3;

  const seen = new Set<string>();
  const perProduct = new Map<string, number>();
  const results: DiscoveryResult[] = [];

  for (const target of targets) {
    if (seen.size >= maxTotal) break;

    const used = perProduct.get(target.product) ?? 0;
    if (used >= maxPerProduct) continue;

    seen.add(target.subreddit);
    perProduct.set(target.product, used + 1);

    results.push(await fetchSubreddit(target, { now: options.now }));
  }

  return results;
}
