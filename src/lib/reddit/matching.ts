/**
 * Match a Reddit thread to the blog post that actually answers it.
 *
 * This is the whole trick to Reddit. A reply that links a product homepage
 * is an ad. A reply that links a genuinely useful article — one that answers
 * the question the person asked — is research, and the link happens to be
 * ours. The article is the value; the product is the byline.
 *
 * The catalogue lives in src/lib/blogPosts.ts. The topic map in
 * articleTopics.ts decides which article answers which question, because word
 * overlap on its own cannot tell a biology course from a business book.
 */

import { BLOG_POSTS } from '../blogPosts.ts';
import { ARTICLE_TOPICS, matchedTopics } from './articleTopics.ts';
import type { RedditProduct } from './types.ts';

export interface ArticleMatch {
  slug: string;
  title: string;
  description: string;
  category: string;
  url: string;
  /** How well the article matched, 0-100. */
  score: number;
  /** The topics that matched, for the operator to sanity-check. */
  matched: string[];
}

/**
 * Find the blog post that best covers the thread's topic.
 *
 * Returns null when nothing matches — and a link-free reply is often the
 * right answer, so null is a normal outcome, not a failure.
 */
export function matchArticle(
  threadTitle: string,
  threadBody: string,
  product: RedditProduct = 'anyfreebook'
): ArticleMatch | null {
  void product; // The catalogue is Anyfreebook's; AfriStudio links to its own pages.

  const text = `${threadTitle} ${threadBody}`;
  let best: ArticleMatch | null = null;

  for (const post of BLOG_POSTS) {
    const entry = ARTICLE_TOPICS.find((a) => a.slug === post.slug);
    if (!entry) continue;

    const titleHits = matchedTopics(post.title, entry.topics);
    const bodyHits = matchedTopics(text, entry.topics);
    if (bodyHits.length === 0) continue;

    // A topic in the thread's title is much stronger evidence than one that
    // only appears in the body.
    const titleBonus = titleHits.length > 0 ? 25 : 0;
    const score = Math.min(100, bodyHits.length * 18 + titleBonus + (post.category === 'Technology' ? 0 : 0));

    if (!best || score > best.score) {
      best = {
        slug: post.slug,
        title: post.title,
        description: post.description,
        category: post.category,
        url: `https://anyfreebook.com/blog/${post.slug}`,
        score,
        matched: bodyHits,
      };
    }
  }

  // One weak match is not enough. Two independent topics, or one strong one
  // — a single shared word like "backend" is not an article answering the
  // question.
  if (!best) return null;
  if (best.matched.length < 2 || best.score < 45) return null;

  return best;
}
