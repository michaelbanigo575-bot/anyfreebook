import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { REDDIT_TARGETS } from '@/lib/reddit/targets';
import { scoreIntent, MAX_AGE_HOURS } from '@/lib/reddit/discovery';
import { buildDraft } from '@/lib/reddit/drafting';
import { matchArticle } from '@/lib/reddit/matching';
import { listTargets, logEvent, saveDraft, savePosts } from '@/lib/reddit/store';
import type { RedditListingChild, RedditPost } from '@/lib/reddit/types';

export const dynamic = 'force-dynamic';

/**
 * Accepts raw Reddit listings and turns them into scored posts and drafts.
 *
 * Reddit blocks datacenter IPs, so the fetch happens on the operator's own
 * machine and the result is handed to this route. The scoring, matching and
 * drafting all happen here, in one place, so there is only ever one
 * implementation of the rules.
 *
 * This route writes to our database. It does not write to Reddit.
 */
export async function POST(request: NextRequest) {
  // Either an admin session, or the shared secret the local script uses.
  const secret = process.env.REDDIT_INGEST_SECRET || process.env.CRON_SECRET;
  const headerSecret = request.headers.get('x-ingest-secret');
  const authorised = (secret && headerSecret === secret) || (await requireAdmin()) !== null;

  if (!authorised) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      listings?: Record<string, RedditListingChild[]>;
    };

    if (!body.listings || typeof body.listings !== 'object') {
      return NextResponse.json({ error: 'Expected { listings: { subreddit: [...] } }' }, { status: 400 });
    }

    const targets = await listTargets();
    const now = Date.now();

    const posts: RedditPost[] = [];

    for (const [subreddit, children] of Object.entries(body.listings)) {
      const target =
        targets.find((t) => t.subreddit.toLowerCase() === subreddit.toLowerCase()) ||
        REDDIT_TARGETS.find((t) => t.subreddit.toLowerCase() === subreddit.toLowerCase());
      if (!target) continue;

      for (const child of children) {
        if (child.kind !== 't3') continue;
        const d = child.data;
        if (d.stickied || d.over_18) continue;

        const createdMs = (d.created_utc ?? 0) * 1000;
        if (!createdMs) continue;
        const ageHours = (now - createdMs) / 3_600_000;
        if (ageHours > MAX_AGE_HOURS) continue;

        const title = d.title ?? '';
        const text = d.selftext ?? '';
        const { score, signals } = scoreIntent(title, text, target.intentKeywords);
        if (score < 30) continue;

        posts.push({
          targetId: target.id ?? null,
          product: target.product,
          subreddit: target.subreddit,
          redditId: d.id,
          title,
          body: text,
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
    }

    const saved = await savePosts(posts);

    // Draft against the threads we just saved.
    let drafted = 0;
    let notReady = 0;
    const drafts: { subreddit: string; title: string; ratio: number; problems: string[] }[] = [];

    for (const post of posts) {
      const target = targets.find((t) => t.subreddit === post.subreddit);
      if (!target) continue;

      const article = matchArticle(post.title, post.body, post.product);
      const { draft, policy } = buildDraft(post, target, { article });

      const draftId = await saveDraft(draft);
      if (!draftId) continue;

      if (policy.ok) {
        drafted++;
        drafts.push({
          subreddit: post.subreddit,
          title: post.title,
          ratio: draft.valueRatio,
          problems: [],
        });
      } else {
        notReady++;
        drafts.push({
          subreddit: post.subreddit,
          title: post.title,
          ratio: draft.valueRatio,
          problems: policy.problems,
        });
      }
    }

    await logEvent('ingest', { posts: posts.length, saved: saved.inserted, drafted, notReady });

    return NextResponse.json({
      ok: true,
      seen: posts.length,
      saved: saved.inserted,
      drafted,
      notReady,
      drafts,
      posted: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[reddit-ingest]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
