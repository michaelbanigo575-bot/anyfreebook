import Image from 'next/image';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getUnifiedFeed, getFollowedAuthorIds } from '@/lib/creators/feedServer';
import { AutoLoadMore } from '@/components/AutoLoadMore';
import { ShareButton } from '@/components/ShareSheet';
import { Icon } from '@/components/icons';
import { SponsorStrip } from '@/components/Sponsors';
import { placeholderGradient } from '@/lib/covers';
import { FeedPubActions } from '@/components/FeedPubActions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Feed — Live Classes, New Books & Updates from ANYFREEBOOK Authors',
  description: 'Live classrooms, newly published books and materials, articles and video updates from ANYFREEBOOK creators — the pulse of the platform.',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

const PUB_TYPE_LABEL: Record<string, string> = {
  lecture_note: '📚 Lecture note', article: '📰 Article', journal: '🔬 Journal',
  licensed: '📜 Licensed work', authored: '✍️ New book', poetry: '🪶 Poetry',
  story: '📖 Story', guide: '🧭 Guide',
};

type Tab = 'foryou' | 'following' | 'live';

const SIDE_LINKS = [
  { href: '/', label: 'Home' }, { href: '/explore', label: 'Explore' }, { href: '/library', label: 'My library' },
  { href: '/classrooms', label: 'Live classes' }, { href: '/profile', label: 'Profile' },
];

export default async function FeedPage({ searchParams }: { searchParams?: { limit?: string; tab?: string } }) {
  // Pagination: ?limit grows by 30 as the reader nears the end (capped at 300)
  const limit = Math.min(300, Math.max(30, parseInt(searchParams?.limit || '30', 10) || 30));
  const tab: Tab = searchParams?.tab === 'following' ? 'following' : searchParams?.tab === 'live' ? 'live' : 'foryou';
  const [feed, followed] = await Promise.all([
    getUnifiedFeed(tab === 'following' ? 300 : limit),
    tab === 'following' ? getFollowedAuthorIds() : Promise.resolve(null),
  ]);
  const { live, soon } = feed;
  const items = tab === 'live' ? []
    : tab === 'following'
      ? feed.items.filter(i => followed?.includes(i.kind === 'publication' ? i.publication.author_id : i.post.author_id))
      : feed.items;
  const mayHaveMore = tab === 'foryou' && limit < 300 && feed.items.length >= limit;

  // Authors seen in the feed, for the desktop column
  const authors = Array.from(new Map(
    feed.items.map(i => (i.kind === 'publication' ? i.publication.author : i.post.author))
      .filter(x => !!x?.creator_handle)
      .map(x => [x!.creator_handle!, x!.display_name || x!.creator_handle!]),
  )).slice(0, 4);

  return (
    <div className="content-wrapper py-4 md:py-5">
      <div className="mx-auto max-w-2xl lg:max-w-6xl lg:grid lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_280px] lg:gap-6">
        {/* Desktop navigation */}
        <nav aria-label="Library" className="hidden lg:block">
          <ul className="sticky top-32 space-y-1">
            {SIDE_LINKS.map(l => (
              <li key={l.href}><Link href={l.href} className="flex items-center min-h-[44px] px-3 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">{l.label}</Link></li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">Community</h1>
            <Link href="/feed/new" className="inline-flex items-center min-h-[44px] px-4 rounded-xl border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold whitespace-nowrap">Post</Link>
          </div>
          <ul className="flex gap-2 overflow-x-auto scrollbar-none mb-3 lg:hidden">
            {[['/classrooms', 'Live classes'], ['/creators/discover', 'Find authors'], ['/institutions', 'Institutions'], ['/creators', 'Publish & Earn']].map(([href, label]) => (
              <li key={href} className="flex-shrink-0">
                <Link href={href} className="inline-flex items-center h-9 px-4 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)]">{label}</Link>
              </li>
            ))}
          </ul>

          <nav aria-label="Feed filters" className="grid grid-cols-3 mb-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
            {([['foryou', 'For you', '/feed'], ['following', 'Following', '/feed?tab=following'], ['live', 'Live', '/feed?tab=live']] as const).map(([id, label, href]) => (
              <Link key={id} href={href} aria-current={tab === id ? 'page' : undefined}
                className={`flex items-center justify-center gap-1.5 min-h-[46px] text-sm font-semibold border-b-[3px] ${tab === id ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
                {label}{id === 'live' && live.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500" aria-label="classes live now" />}
              </Link>
            ))}
          </nav>

      {/* 🔴 Live public classrooms — pinned, TikTok-Live style */}
      {tab !== 'following' && live.length > 0 && (
        <div className="space-y-3 mb-4">
          {live.map(c => (
            <Link key={c.id} href={`/class/${c.room_code}`} className="block rounded-2xl overflow-hidden border-2 border-red-500/50 bg-gradient-to-r from-red-500/10 to-transparent hover:shadow-lg transition-all">
              <div className="p-4 flex items-center gap-3">
                <span className="relative flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-2xl">
                  🎓
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[var(--surface)] animate-pulse" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold uppercase">Live</span>
                    <span className="text-[11px] text-[var(--text-muted)]">👥 {c.peak_attendance} watching</span>
                  </div>
                  <h2 className="font-bold text-[var(--text)] truncate mt-0.5">{c.title}</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">{c.host?.display_name || 'Author'} is teaching live{c.publication ? ` · 📖 ${c.publication.title}` : ''}</p>
                </div>
                <span className="flex-shrink-0 px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">Join →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming classes strip */}
      {tab !== 'following' && soon.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">🗓 Classes starting soon</h2>
            <Link href="/classrooms" className="text-[11px] text-[var(--primary)] hover:underline">All classes →</Link>
          </div>
          <div className="space-y-2">
            {soon.map(c => (
              <Link key={c.id} href={`/class/${c.room_code}`} className="flex items-center justify-between gap-3 text-sm hover:text-[var(--primary)] transition-colors">
                <span className="truncate text-[var(--text)]">{c.title}</span>
                <span className="flex-shrink-0 text-xs font-semibold text-[var(--primary)]">{fmtWhen(c.scheduled_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'live' ? (
        live.length === 0 && soon.length === 0 && <p className="py-8 text-center text-[var(--text-muted)]">No classes are live or starting soon. <Link href="/classrooms" className="text-[var(--primary)] font-semibold">See all classes</Link></p>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg font-medium text-[var(--text-secondary)]">
            {tab !== 'following' ? 'Nothing in the feed yet' : followed === null ? 'Sign in to see the authors you follow' : 'Nothing from authors you follow yet'}
          </p>
          <Link href={tab === 'following' ? (followed === null ? '/login?redirect=/feed' : '/feed') : '/feed/new'} className="inline-flex items-center min-h-[44px] mt-5 px-6 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">
            {tab !== 'following' ? 'Create a post' : followed === null ? 'Sign in' : 'Find authors in For you'}
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map(item => {
            if (item.kind === 'publication') {
              const pub = item.publication;
              return (
                <article key={`pub-${pub.id}`} className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
                  <div className="p-4 pb-0 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#050F26] ring-2 ring-[#6EC1EA] flex items-center justify-center text-white font-serif-title font-bold flex-shrink-0">
                      {(pub.author?.display_name || 'A').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {pub.author?.creator_handle ? (
                        <Link href={`/author/${pub.author.creator_handle}`} className="block truncate text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)]">{pub.author.display_name || 'Author'}</Link>
                      ) : (
                        <span className="block truncate text-sm font-semibold text-[var(--text)]">{pub.author?.display_name || 'Author'}</span>
                      )}
                      <div className="text-xs text-[var(--text-muted)]">{(PUB_TYPE_LABEL[pub.publication_type || ''] || 'Publication').replace(/^[^A-Za-z]+/, '')} · {timeAgo(pub.published_at)}</div>
                    </div>
                  </div>
                  <Link href={`/read/${pub.slug}`} className="flex gap-4 p-4">
                    <span className={`relative flex-shrink-0 w-24 h-36 overflow-hidden rounded-r-lg rounded-l-sm border-l-[3px] border-[#6EC1EA] bg-gradient-to-br ${placeholderGradient(pub.title)} shadow-book`}>
                      {pub.cover_url
                        ? <Image src={pub.cover_url} alt="" fill sizes="96px" className="object-cover object-top" />
                        : <span className="absolute inset-0 flex items-end p-2 font-serif-title text-xs font-bold text-white line-clamp-4">{pub.title}</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-serif-title text-lg font-bold leading-snug text-[var(--text)] line-clamp-3">{pub.title}</span>
                      {pub.description && <span className="block mt-1.5 text-sm text-[var(--text-muted)] line-clamp-3">{pub.description}</span>}
                    </span>
                  </Link>
                  <div className="px-4">
                    <Link href={`/read/${pub.slug}`} className="flex items-center justify-center min-h-[46px] rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Read free</Link>
                  </div>
                  <FeedPubActions
                    publicationId={pub.id}
                    slug={pub.slug}
                    title={pub.title}
                    initialLikes={pub.like_count}
                    commentCount={pub.comment_count}
                    viewCount={pub.view_count}
                  />
                </article>
              );
            }

            const post = item.post;
            const embed = post.video_url ? youtubeEmbed(post.video_url) : null;
            return (
              <article key={`post-${post.id}`} className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(post.author?.display_name || 'A').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {post.author?.creator_handle ? (
                      <Link href={`/author/${post.author.creator_handle}`} className="text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)]">
                        {post.author.display_name || 'Author'}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text)]">{post.author?.display_name || 'Author'}</span>
                    )}
                    <div className="text-[11px] text-[var(--text-muted)]">{timeAgo(post.published_at)} · {post.category}</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold uppercase flex-shrink-0">
                    {post.post_type}
                  </span>
                </div>

                <h2 className="px-4 text-lg font-bold text-[var(--text)] leading-snug">{post.title}</h2>

                {post.body && (
                  <p className="px-4 mt-2 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">{post.body}</p>
                )}

                {post.cover_url && !embed && (
                  <Image src={post.cover_url} alt={post.title} width={672} height={320} className="w-full mt-3 max-h-80 object-cover" />
                )}

                {embed && (
                  <div className="mt-3 aspect-video">
                    <iframe src={embed} title={post.title} className="w-full h-full" allowFullScreen />
                  </div>
                )}

                {post.file_url && (
                  <div className="px-4 mt-3">
                    <a href={post.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold hover:opacity-90">
                      📎 Open attached file
                    </a>
                  </div>
                )}

                <div className="px-4 py-2 mt-2 border-t border-[var(--border-subtle)] flex items-center gap-5 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1.5"><Icon name="heart" size={17} />{post.like_count}</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="comment" size={17} />{post.comment_count}</span>
                  <span>{post.view_count} reads</span>
                  <ShareButton path="/feed" title={post.title} className="ml-auto inline-flex items-center gap-1.5 min-h-[44px] px-2 font-semibold text-[var(--text-secondary)]"><Icon name="share" size={17} />Share</ShareButton>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {mayHaveMore && <AutoLoadMore href={`/feed?limit=${limit + 30}`} />}
        </div>

        {/* Desktop side column */}
        <aside className="hidden xl:block">
          <div className="sticky top-32 space-y-4">
            <section className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
              <h2 className="text-sm font-bold text-[var(--text)] mb-2">Live classes</h2>
              {[...live, ...soon].slice(0, 3).map(c => (
                <Link key={c.id} href={`/class/${c.room_code}`} className="block py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] line-clamp-1">{c.title}</Link>
              ))}
              {live.length + soon.length === 0 && <Link href="/classrooms" className="text-sm text-[var(--primary)] font-semibold">Browse classes</Link>}
            </section>
            {authors.length > 0 && (
              <section className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
                <h2 className="text-sm font-bold text-[var(--text)] mb-2">Authors to explore</h2>
                {authors.map(([handle, name]) => (
                  <Link key={handle} href={`/author/${handle}`} className="flex items-center gap-2.5 min-h-[44px] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)]">
                    <span className="w-8 h-8 rounded-full bg-[#050F26] text-white text-xs flex items-center justify-center">{name.slice(0, 1).toUpperCase()}</span>
                    <span className="truncate">{name}</span>
                  </Link>
                ))}
              </section>
            )}
            <SponsorStrip offset={4} />
          </div>
        </aside>
      </div>
    </div>
  );
}
