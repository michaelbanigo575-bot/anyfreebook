import Image from 'next/image';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getUnifiedFeed } from '@/lib/creators/feedServer';
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

export default async function FeedPage({ searchParams }: { searchParams?: { limit?: string } }) {
  // Pagination: ?limit grows by 30 per "Load more" click (capped at 300)
  const limit = Math.min(300, Math.max(30, parseInt(searchParams?.limit || '30', 10) || 30));
  const { live, soon, items } = await getUnifiedFeed(limit);
  const mayHaveMore = items.length >= limit;

  return (
    <div className="content-wrapper py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">📰 Feed</h1>
          <p className="text-[var(--text-muted)] mt-1">Live classes, new works, and updates from ANYFREEBOOK authors</p>
        </div>
        <Link href="/feed/new" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap">
          + Post
        </Link>
      </div>

      {/* 🔴 Live public classrooms — pinned, TikTok-Live style */}
      {live.length > 0 && (
        <div className="space-y-3 mb-6">
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
      {soon.length > 0 && (
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

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">Nothing in the feed yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Be the first to share an update.</p>
          <Link href="/feed/new" className="inline-flex mt-6 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90">
            Create a post
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map(item => {
            if (item.kind === 'publication') {
              const pub = item.publication;
              return (
                <article key={`pub-${pub.id}`} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(pub.author?.display_name || 'A').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {pub.author?.creator_handle ? (
                        <Link href={`/author/${pub.author.creator_handle}`} className="text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)]">
                          {pub.author.display_name || 'Author'}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-[var(--text)]">{pub.author?.display_name || 'Author'}</span>
                      )}
                      <div className="text-[11px] text-[var(--text-muted)]">published {timeAgo(pub.published_at)}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold uppercase flex-shrink-0">
                      {PUB_TYPE_LABEL[pub.publication_type || ''] || '📖 Publication'}
                    </span>
                  </div>
                  <Link href={`/read/${pub.slug}`}>
                    <h2 className="px-4 text-lg font-bold text-[var(--text)] leading-snug hover:text-[var(--primary)] transition-colors">{pub.title}</h2>
                  </Link>
                  {pub.description && (
                    <p className="px-4 mt-2 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">{pub.description}</p>
                  )}
                  {pub.cover_url && (
                    <Image src={pub.cover_url} alt={pub.title} width={672} height={320} className="w-full mt-3 max-h-80 object-cover" />
                  )}
                  <FeedPubActions
                    publicationId={pub.id}
                    slug={pub.slug}
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
              <article key={`post-${post.id}`} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
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

                <div className="px-4 py-3 mt-2 border-t border-[var(--border-subtle)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>❤️ {post.like_count}</span>
                  <span>💬 {post.comment_count}</span>
                  <span>📖 {post.view_count} reads</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {mayHaveMore && (
        <div className="text-center mt-8">
          <a
            href={`/feed?limit=${limit + 30}`}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors"
          >
            Load more ↓
          </a>
        </div>
      )}
    </div>
  );
}
