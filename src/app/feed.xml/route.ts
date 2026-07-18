import { NextResponse } from 'next/server';
import { getFeedPublications } from '@/lib/creators/feedServer';
import { getLivePublicClassrooms, getSoonPublicClassrooms } from '@/lib/creators/feedServer';

export const dynamic = 'force-dynamic';
export const revalidate = 900; // 15 minutes

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Public RSS 2.0 feed: newly published works + live/upcoming public classrooms. */
export async function GET() {
  const [pubs, live, soon] = await Promise.all([
    getFeedPublications(40),
    getLivePublicClassrooms(),
    getSoonPublicClassrooms(),
  ]);

  type Item = { title: string; link: string; description: string; pubDate: string; guid: string };
  const items: Item[] = [];

  for (const p of pubs) {
    items.push({
      title: p.title,
      link: `https://anyfreebook.com/read/${p.slug}`,
      description: p.description || `New on ANYFREEBOOK by ${p.author?.display_name || 'an independent author'}.`,
      pubDate: new Date(p.published_at || Date.now()).toUTCString(),
      guid: `https://anyfreebook.com/read/${p.slug}`,
    });
  }
  for (const c of [...live, ...soon]) {
    items.push({
      title: `Live class: ${c.title}`,
      link: `https://anyfreebook.com/class/${c.room_code}`,
      description: c.description || `Free live classroom hosted by ${c.host?.display_name || 'an ANYFREEBOOK creator'} on ANYFREEBOOK.`,
      pubDate: new Date(c.scheduled_at).toUTCString(),
      guid: `https://anyfreebook.com/class/${c.room_code}`,
    });
  }

  items.sort((a, b) => +new Date(b.pubDate) - +new Date(a.pubDate));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>ANYFREEBOOK — New books &amp; live classes</title>
  <link>https://anyfreebook.com</link>
  <atom:link href="https://anyfreebook.com/feed.xml" rel="self" type="application/rss+xml" />
  <description>New publications and live classrooms from ANYFREEBOOK creators.</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.map(it => `  <item>
    <title>${escapeXml(it.title)}</title>
    <link>${it.link}</link>
    <guid isPermaLink="true">${it.guid}</guid>
    <description>${escapeXml(it.description)}</description>
    <pubDate>${it.pubDate}</pubDate>
  </item>`).join('\n')}
</channel>
</rss>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
