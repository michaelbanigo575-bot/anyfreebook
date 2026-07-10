import type { Metadata } from 'next';
import Link from 'next/link';
import { getFeedPosts } from '@/lib/creators/feedServer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Feed — News, Updates & Short Reads from ANYFREEBOOK Authors',
  description: 'Articles, video updates, and quick reads from ANYFREEBOOK creators — the pulse of the platform.',
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

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default async function FeedPage() {
  const posts = await getFeedPosts(30);

  return (
    <div className="content-wrapper py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">📰 Feed</h1>
          <p className="text-[var(--text-muted)] mt-1">News, updates, and quick reads from ANYFREEBOOK authors</p>
        </div>
        <Link href="/feed/new" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap">
          + Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg font-medium text-[var(--text-secondary)]">No posts yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Be the first to share an update.</p>
          <Link href="/feed/new" className="inline-flex mt-6 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90">
            Create a post
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map(post => {
            const embed = post.video_url ? youtubeEmbed(post.video_url) : null;
            return (
              <article key={post.id} className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
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
                  <img src={post.cover_url} alt={post.title} className="w-full mt-3 max-h-80 object-cover" />
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
                  <span>👁 {post.view_count}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
