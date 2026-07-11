import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuthorByHandle } from '@/lib/creators/server';
import { getLiveClassForAuthor } from '@/lib/classrooms/server';
import { tierForReads } from '@/lib/creators/types';
import { FollowButton } from '@/components/FollowButton';

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

export default async function AuthorPage({ params }: { params: { handle: string } }) {
  const data = await getAuthorByHandle(params.handle);
  if (!data) notFound();
  const { author, pubs, totalReads } = data;
  const tier = tierForReads(totalReads);
  const liveClass = await getLiveClassForAuthor(author.id);

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      {/* Author header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
          {(author.display_name || 'A').slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-display font-bold text-[var(--text)]">{author.display_name || params.handle}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${tier.color}`}>{tier.label}</span>
          </div>
          {liveClass && (
            <Link href={`/class/${liveClass.room_code}`} className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE — teaching now: {liveClass.title.slice(0, 32)}{liveClass.title.length > 32 ? '…' : ''} →
            </Link>
          )}
          <p className="text-sm text-[var(--text-muted)]">@{author.creator_handle}</p>
          {author.creator_bio && <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-lg">{author.creator_bio}</p>}
          <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-[var(--text-muted)]">
            <span><strong className="text-[var(--text)]">{fmt(author.follower_count || 0)}</strong> readers</span>
            <span><strong className="text-[var(--text)]">{pubs.length}</strong> works</span>
            <span><strong className="text-[var(--text)]">{fmt(totalReads)}</strong> total reads</span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <FollowButton authorId={author.id} initialFollowers={author.follower_count || 0} />
        </div>
      </div>

      {/* Works */}
      {pubs.length === 0 ? (
        <p className="text-center py-16 text-[var(--text-muted)]">No published works yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {pubs.map(p => (
            <Link key={p.id} href={`/read/${p.slug}`} className="group rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg transition-all overflow-hidden">
              {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full h-36 object-cover" />}
              <div className="p-4">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary)] uppercase">{p.content_type}</span>
                <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] mt-1.5 line-clamp-2">{p.title}</h3>
                {p.description && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{p.description}</p>}
                <div className="text-[11px] text-[var(--text-muted)] mt-2">{fmt(p.view_count)} reads · {fmt(p.read_count)} verified</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
