import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { pingIndexNow } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

/**
 * Daily distribution: finds publications published in the last 24h and
 * posts them, openly labeled as ANYFREEBOOK's own account, to whichever
 * channels are configured. Every channel is optional and no-ops cleanly
 * until its env vars are set — nothing here impersonates a person or hides
 * that it's automated brand distribution.
 *
 *   DISCORD_WEBHOOK_URL   — Discord server webhook (Server Settings > Integrations)
 *   MASTODON_API_URL      — e.g. https://mastodon.social
 *   MASTODON_ACCESS_TOKEN — Mastodon app access token
 */

interface NewPub { title: string; slug: string; description: string | null; author_name: string | null }

async function findNewPublications(): Promise<NewPub[]> {
  const sb = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await sb
    .from('publications')
    .select('title, slug, description, author:profiles!publications_author_id_fkey(display_name)')
    .eq('status', 'published')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(10);
  return ((data || []) as unknown as { title: string; slug: string; description: string | null; author: { display_name: string | null } | null }[])
    .map(p => ({ title: p.title, slug: p.slug, description: p.description, author_name: p.author?.display_name || null }));
}

async function postDiscord(pub: NewPub): Promise<string | null> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return null;
  const line = `📖 **New on ANYFREEBOOK**: "${pub.title}"${pub.author_name ? ` by ${pub.author_name}` : ''}\nhttps://anyfreebook.com/read/${pub.slug}`;
  // Return a failure string instead of swallowing: a silently dropped post means
  // a creator's book is simply never announced and nobody finds out.
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: line }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `discord ${res.status}`;
    return null;
  } catch (err) {
    return `discord ${err instanceof Error ? err.message : 'request failed'}`;
  }
}

async function postMastodon(pub: NewPub): Promise<string | null> {
  const base = process.env.MASTODON_API_URL;
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!base || !token) return null;
  const status = `New on ANYFREEBOOK: "${pub.title}"${pub.author_name ? ` by ${pub.author_name}` : ''} — free to read.\nhttps://anyfreebook.com/read/${pub.slug}`;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/statuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, visibility: 'public' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `mastodon ${res.status}`;
    return null;
  } catch (err) {
    return `mastodon ${err instanceof Error ? err.message : 'request failed'}`;
  }
}

export async function GET() {
  const pubs = await findNewPublications();

  const outcomes = await Promise.all(pubs.flatMap(p => [postDiscord(p), postMastodon(p)]));
  const failures = outcomes.filter((r): r is string => r !== null);
  if (failures.length > 0) console.error('[daily-distribution] announcement failures:', failures);
  void pingIndexNow(pubs.map(p => `https://anyfreebook.com/read/${p.slug}`));

  return NextResponse.json({
    ok: failures.length === 0,
    distributed: pubs.length,
    failures,
    discordConfigured: !!process.env.DISCORD_WEBHOOK_URL,
    mastodonConfigured: !!(process.env.MASTODON_API_URL && process.env.MASTODON_ACCESS_TOKEN),
  });
}
