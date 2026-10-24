/**
 * Persistence for the Reddit queue.
 *
 * Nothing in this module can post anything. It stores targets, discovered
 * threads and drafts, and records what the operator did with them.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { RedditDraft, RedditPost, RedditTarget } from './types';

type Sb = ReturnType<typeof createServiceClient>;

/** Rows come back untyped because this project has no generated Database type. */
type Row = Record<string, unknown>;

/** Replace the target list with the seeded one, keeping any operator edits. */
export async function syncTargets(seed: RedditTarget[]): Promise<void> {
  const sb = createServiceClient();

  const { data: existing } = await sb.from('reddit_targets').select('id, product, subreddit');

  for (const target of seed) {
    const match = (existing || []).find(
      (r: Row) => r.product === target.product && String(r.subreddit).toLowerCase() === target.subreddit.toLowerCase()
    );

    if (match) {
      // Only fill in the rule fields the operator has not set themselves.
      await sb
        .from('reddit_targets')
        .update({
          purpose: target.purpose,
          intent_keywords: target.intentKeywords,
          links_allowed: match.links_allowed ?? target.linksAllowed,
          self_promo_thread: match.self_promo_thread ?? target.selfPromoThread,
          min_account_age_days: match.min_account_age_days ?? target.minAccountAgeDays,
          min_karma: match.min_karma ?? target.minKarma,
        })
        .eq('id', match.id);
    } else {
      await sb.from('reddit_targets').insert({
        product: target.product,
        subreddit: target.subreddit,
        purpose: target.purpose,
        intent_keywords: target.intentKeywords,
        links_allowed: target.linksAllowed,
        self_promo_thread: target.selfPromoThread,
        min_account_age_days: target.minAccountAgeDays,
        min_karma: target.minKarma,
        rules_verified_at: target.rulesVerifiedAt,
        active: target.active,
      });
    }
  }
}

export async function listTargets(): Promise<RedditTarget[]> {
  const sb = createServiceClient();
  try {
    const { data } = await sb.from('reddit_targets').select('*').order('product').order('subreddit');
    return (data || []).map((row: Row) => rowToTarget(row));
  } catch (err) {
    // The tables are missing until migration 013 is applied. Say so rather
    // than taking the admin page down.
    console.error('[reddit] reddit_targets unreadable — apply supabase/migrations/013_reddit.sql', err);
    return [];
  }
}

function rowToTarget(row: Record<string, unknown>): RedditTarget {
  return {
    id: row.id as string,
    product: row.product as RedditTarget['product'],
    subreddit: row.subreddit as string,
    purpose: (row.purpose as string) || '',
    intentKeywords: (row.intent_keywords as string[]) || [],
    linksAllowed: row.links_allowed === null || row.links_allowed === undefined ? null : Boolean(row.links_allowed),
    selfPromoThread: (row.self_promo_thread as string) || null,
    minAccountAgeDays: (row.min_account_age_days as number) ?? null,
    minKarma: (row.min_karma as number) ?? null,
    rulesVerifiedAt: (row.rules_verified_at as string) || null,
    active: row.active !== false,
    lastFetchedAt: (row.last_fetched_at as string) || null,
  };
}

/**
 * How many distinct subreddits have been read today.
 *
 * The cap is a property of the day, not of the process, so it is counted
 * from the database rather than from memory.
 */
export async function subredditsReadToday(now = new Date()): Promise<number> {
  const sb = createServiceClient();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data } = await sb
      .from('reddit_posts')
      .select('subreddit')
      .gte('first_seen_at', since);
    return new Set((data || []).map((r: Row) => String(r.subreddit).toLowerCase())).size;
  } catch {
    return 0;
  }
}

/** Save newly discovered threads, skipping ones we already have. */
export async function savePosts(posts: RedditPost[]): Promise<{ inserted: number; skipped: number }> {
  if (posts.length === 0) return { inserted: 0, skipped: 0 };
  const sb = createServiceClient();

  let inserted = 0;
  let skipped = 0;

  for (const post of posts) {
    const { error } = await sb.from('reddit_posts').upsert(
      {
        target_id: post.targetId ?? null,
        product: post.product,
        subreddit: post.subreddit,
        reddit_id: post.redditId,
        title: post.title,
        body: post.body,
        author: post.author,
        url: post.url,
        permalink: post.permalink,
        created_utc: post.createdUtc,
        score: post.score,
        num_comments: post.numComments,
        intent_score: post.intentScore,
        intent_signals: post.intentSignals,
        status: post.status,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'reddit_id', ignoreDuplicates: true }
    );
    if (error) {
      skipped++;
      console.error('[reddit] failed to save post', post.redditId, error.message);
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

/** Threads worth drafting: new, high-intent, still recent. */
export async function listCandidatePosts(limit = 25): Promise<RedditPost[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('reddit_posts')
    .select('*')
    .in('status', ['new', 'drafted'])
    .gte('intent_score', 30)
    .order('intent_score', { ascending: false })
    .limit(limit);
  return (data || []).map((row: Row) => rowToPost(row));
}

function rowToPost(row: Record<string, unknown>): RedditPost {
  return {
    id: row.id as string,
    targetId: (row.target_id as string) || null,
    product: row.product as RedditPost['product'],
    subreddit: row.subreddit as string,
    redditId: row.reddit_id as string,
    title: (row.title as string) || '',
    body: (row.body as string) || '',
    author: (row.author as string) || '',
    url: (row.url as string) || '',
    permalink: (row.permalink as string) || '',
    createdUtc: (row.created_utc as string) || '',
    score: (row.score as number) ?? 0,
    numComments: (row.num_comments as number) ?? 0,
    intentScore: (row.intent_score as number) ?? 0,
    intentSignals: (row.intent_signals as string[]) || [],
    status: (row.status as RedditPost['status']) || 'new',
    firstSeenAt: (row.first_seen_at as string) || undefined,
    lastSeenAt: (row.last_seen_at as string) || undefined,
  };
}

export async function saveDraft(draft: RedditDraft): Promise<string | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('reddit_drafts')
    .insert({
      post_id: draft.postId ?? null,
      product: draft.product,
      subreddit: draft.subreddit,
      body: draft.body,
      answer_body: draft.answerBody,
      mention_body: draft.mentionBody,
      disclosure: draft.disclosure,
      value_ratio: draft.valueRatio,
      linked_article_slug: draft.linkedArticleSlug,
      linked_article_url: draft.linkedArticleUrl,
      rule_checks: draft.ruleChecks,
      status: draft.status,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[reddit] failed to save draft', error.message);
    return null;
  }
  if (draft.postId) {
    await sb.from('reddit_posts').update({ status: 'drafted' }).eq('id', draft.postId);
  }
  return data?.id ?? null;
}

export async function listDrafts(limit = 50): Promise<RedditDraft[]> {
  const sb = createServiceClient();
  let data: Row[] | null = null;
  try {
    const result = await sb
      .from('reddit_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    data = result.data;
  } catch (err) {
    console.error('[reddit] reddit_drafts unreadable — apply supabase/migrations/013_reddit.sql', err);
  }
  return (data || []).map((row: Row) => ({
    id: row.id as string,
    postId: (row.post_id as string) || null,
    product: row.product as RedditDraft['product'],
    subreddit: row.subreddit as string,
    body: row.body as string,
    answerBody: row.answer_body as string,
    mentionBody: row.mention_body as string,
    disclosure: row.disclosure as string,
    valueRatio: (row.value_ratio as number) ?? 0,
    linkedArticleSlug: (row.linked_article_slug as string) || null,
    linkedArticleUrl: (row.linked_article_url as string) || null,
    ruleChecks: (row.rule_checks as string[]) || [],
    status: (row.status as RedditDraft['status']) || 'draft',
    reviewedAt: (row.reviewed_at as string) || null,
    submittedAt: (row.submitted_at as string) || null,
    createdAt: row.created_at as string,
  }));
}

/**
 * Record that the operator submitted a draft by hand.
 *
 * This is the only "posting" action in the system and it does not talk to
 * Reddit at all — it is a note in our own database so the operator can see
 * what has already been answered and not answer it twice.
 */
export async function markSubmitted(draftId: string): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from('reddit_drafts')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), reviewed_at: new Date().toISOString() })
    .eq('id', draftId);
}

export async function markDiscarded(draftId: string): Promise<void> {
  const sb = createServiceClient();
  await sb
    .from('reddit_drafts')
    .update({ status: 'discarded', reviewed_at: new Date().toISOString() })
    .eq('id', draftId);
}

/** A rolling log of what the system did, so a spike is visible after the fact. */
export async function logEvent(eventType: string, detail: Record<string, unknown> = {}): Promise<void> {
  const sb = createServiceClient();
  await sb.from('reddit_events').insert({ event_type: eventType, detail });
}

export async function listEvents(limit = 50): Promise<{ event_type: string; detail: unknown; created_at: string }[]> {
  const sb = createServiceClient();
  try {
    const { data } = await sb
      .from('reddit_events')
      .select('event_type, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

export type { Sb };
