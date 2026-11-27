import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuthorByHandle, getAuthorPosts } from '@/lib/creators/server';
import { ShareButton } from '@/components/ShareSheet';
import { Icon } from '@/components/icons';
import { placeholderGradient } from '@/lib/covers';
import { getLiveClassForAuthor } from '@/lib/classrooms/server';
import { tierForReads } from '@/lib/creators/types';
import { FollowButton } from '@/components/FollowButton';
import { MessageButton } from '@/components/chat/MessageButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const data = await getAuthorByHandle(params.handle);
  if (!data) return {};
  return {
    title: `${data.author.display_name || params.handle} — Author on ANYFREEBOOK`,
    description: data.author.creator_bio || `Read works by ${data.author.display_name || params.handle} on ANYFREEBOOK.`,
  };
}

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default async function AuthorPage({ params, searchParams }: { params: { handle: string }; searchParams?: { tab?: string } }) {
  const tab = searchParams?.tab === 'posts' ? 'posts' : searchParams?.tab === 'about' ? 'about' : 'works';
  const data = await getAuthorByHandle(params.handle);
  if (!data) notFound();
  const { author, pubs, totalReads } = data;
  const tier = tierForReads(totalReads);
  const [liveClass, posts] = await Promise.all([
    getLiveClassForAuthor(author.id),
    tab === 'posts' ? getAuthorPosts(author.id) : Promise.resolve([]),
  ]);
  const name = author.display_name || params.handle;
  const views = pubs.reduce((n, p) => n + (p.view_count || 0), 0);
  const joined = author.creator_joined_at ? new Date(author.creator_joined_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;

  const stats = [
    [fmt(author.follower_count || 0), 'followers'],
    [String(pubs.length), 'works'],
    [fmt(views), 'reads'],
    [fmt(totalReads), 'verified reads'],
  ];

  return (
    <div className="content-wrapper pt-3 pb-8 max-w-4xl mx-auto">
      {/* Banner and identity */}
      <header className="premium-card rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border-subtle)]">
        <div aria-hidden className="h-28 sm:h-40 bg-gradient-to-br from-[#050F26] via-[#00486B] to-[#00628C] border-b-2 border-[#6EC1EA]" />
        <div className="px-4 sm:px-6 pb-5">
          <div className="-mt-10 w-20 h-20 sm:w-24 sm:h-24 sm:-mt-12 rounded-full overflow-hidden ring-4 ring-[var(--surface)] border-2 border-[#6EC1EA] bg-[#050F26] flex items-center justify-center text-white text-3xl font-serif-title font-bold relative">
            {author.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
              : name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <h1 className="text-2xl font-display font-bold text-[var(--text)] break-all">{name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${tier.color}`}>{tier.label}</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">@{author.creator_handle}</p>
          {author.creator_bio && <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-lg">{author.creator_bio}</p>}
          {liveClass && (
            <Link href={`/class/${liveClass.room_code}`} className="inline-flex items-center gap-1.5 mt-3 px-3 min-h-[36px] rounded-full bg-red-600 text-white text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now: {liveClass.title.slice(0, 32)}{liveClass.title.length > 32 ? '…' : ''}
            </Link>
          )}
          <dl className="grid grid-cols-4 gap-2 mt-4">
            {stats.map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse rounded-xl bg-[var(--bg-secondary)] py-2 text-center">
                <dt className="text-[11px] leading-tight text-[var(--text-muted)]">{label}</dt>
                <dd className="text-lg font-bold text-[var(--text)]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <FollowButton authorId={author.id} initialFollowers={author.follower_count || 0} />
            <MessageButton authorId={author.id} />
            <ShareButton path={`/author/${author.creator_handle}`} title={`${name} on ANYFREEBOOK`} className="inline-flex items-center gap-2 min-h-[40px] px-5 rounded-full border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold">
              <Icon name="share" size={17} />Share
            </ShareButton>
          </div>
        </div>
      </header>

      <nav aria-label="Profile sections" className="grid grid-cols-3 mt-4 mb-4 border-b border-[var(--border-subtle)]">
        {(['works', 'posts', 'about'] as const).map(id => (
          <Link key={id} href={id === 'works' ? `/author/${params.handle}` : `/author/${params.handle}?tab=${id}`} replace scroll={false} aria-current={tab === id ? 'page' : undefined}
            className={`flex items-center justify-center min-h-[46px] text-sm font-semibold capitalize border-b-[3px] ${tab === id ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
            {id}
          </Link>
        ))}
      </nav>

      {tab === 'works' && (pubs.length === 0 ? (
        <p className="text-center py-8 text-[var(--text-muted)]">No published works yet.</p>
      ) : (
        <ul className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {pubs.map(p => (
            <li key={p.id}>
              <Link href={`/read/${p.slug}`} className="group block">
                <span className={`relative block aspect-[2/3] overflow-hidden rounded-r-lg rounded-l-sm border-l-[3px] border-[#6EC1EA] bg-gradient-to-br ${placeholderGradient(p.title)} shadow-book group-hover:-translate-y-1 transition-transform`}>
                  {p.cover_url
                    ? <Image src={p.cover_url} alt="" fill sizes="(max-width: 768px) 33vw, 220px" className="object-cover object-top" />
                    : <span className="absolute inset-0 flex items-end p-2 font-serif-title text-xs sm:text-sm font-bold text-white line-clamp-5">{p.title}</span>}
                </span>
                <span className="block mt-2 text-xs sm:text-sm font-semibold text-[var(--text)] line-clamp-2">{p.title}</span>
                <span className="block text-[11px] text-[var(--text-muted)]">{fmt(p.view_count)} reads</span>
              </Link>
            </li>
          ))}
        </ul>
      ))}

      {tab === 'posts' && (posts.length === 0 ? (
        <p className="text-center py-8 text-[var(--text-muted)]">No posts yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <article key={p.id} className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
              <p className="text-xs text-[var(--text-muted)] capitalize">{p.post_type}{p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : ''}</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--text)]">{p.title}</h2>
              {p.body && <p className="mt-2 text-sm text-[var(--text-secondary)] whitespace-pre-line line-clamp-6">{p.body}</p>}
            </article>
          ))}
        </div>
      ))}

      {tab === 'about' && (
        <div className="premium-card rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-5 space-y-3 text-sm text-[var(--text-secondary)]">
          <p>{author.creator_bio || `${name} has not written a bio yet.`}</p>
          {joined && <p>Creator since {joined}</p>}
          <p>“Reads” counts opens of a work. “Verified reads” counts readers who stayed at least 30 seconds and scrolled at least halfway.</p>
        </div>
      )}
    </div>
  );
}
