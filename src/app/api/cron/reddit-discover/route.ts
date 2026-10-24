import { NextRequest, NextResponse } from 'next/server';
import { REDDIT_TARGETS } from '@/lib/reddit/targets';
import { discover } from '@/lib/reddit/discovery';
import { MAX_SUBREDDITS_PER_DAY, MAX_SUBREDDITS_PER_PRODUCT_PER_DAY } from '@/lib/reddit/policy';
import {
  listTargets,
  logEvent,
  savePosts,
  subredditsReadToday,
  syncTargets,
} from '@/lib/reddit/store';

export const dynamic = 'force-dynamic';

/**
 * Daily Reddit discovery. READ-ONLY.
 *
 * It lists new threads in the subreddits we watch, scores them for intent and
 * stores them in the queue for a human to draft against. It never posts,
 * never comments, never votes and never messages. There is no call to a
 * Reddit write endpoint in this file, and there is no route anywhere in this
 * app that submits a Reddit comment.
 *
 * Note on hosting: Reddit blocks datacenter IP ranges on its JSON endpoints,
 * so a Vercel-hosted cron usually gets HTTP 403 and returns nothing. The
 * reliable path is running the same logic locally:
 *
 *   node scripts/reddit-discover.mjs
 *
 * The caps here (5 subreddits a day, 3 per product) are the same ones the
 * script enforces, and both count from the database so the limit holds
 * across restarts.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await syncTargets(REDDIT_TARGETS);

    const readToday = await subredditsReadToday();
    const budget = Math.max(0, MAX_SUBREDDITS_PER_DAY - readToday);

    if (budget === 0) {
      return NextResponse.json({
        ok: true,
        skipped: 'daily cap reached',
        readToday,
        cap: MAX_SUBREDDITS_PER_DAY,
      });
    }

    const targets = (await listTargets()).filter((t) => t.active);
    const results = await discover(targets, {
      allowedToday: budget,
      perProductAllowed: MAX_SUBREDDITS_PER_PRODUCT_PER_DAY,
    });

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const result of results) {
      if (result.error) {
        errors.push(`r/${result.target.subreddit}: ${result.error}`);
        continue;
      }
      const saved = await savePosts(result.posts);
      inserted += saved.inserted;
      skipped += saved.skipped;
    }

    await logEvent('discovery', {
      subreddits: results.map((r) => r.target.subreddit),
      inserted,
      skipped,
      errors,
    });

    return NextResponse.json({
      ok: errors.length === 0,
      readToday,
      cap: MAX_SUBREDDITS_PER_DAY,
      subreddits: results.map((r) => ({
        subreddit: r.target.subreddit,
        product: r.target.product,
        found: r.posts.length,
        error: r.error ?? null,
      })),
      inserted,
      skipped,
      errors,
      posted: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[reddit-discover]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
