import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicationBySlug, getPublishedChapters } from '@/lib/creators/server';
import { PublicationContent } from '@/components/PublicationContent';
import { ReadTracker } from '@/components/ReadTracker';
import { ReaderFooterAd } from '@/components/ReaderFooterAd';
import { PublicationInteractions } from '@/components/PublicationInteractions';
import { CommentsSection } from '@/components/CommentsSection';
import { FollowButton } from '@/components/FollowButton';
import { ReaderSurface } from '@/components/ReaderSurface';
import { AiStudyAids } from '@/components/AiStudyAids';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getPublicationBySlug(params.slug);
  if (!data) return {};
  const { pub, author } = data;
  return {
    title: `${pub.title}${author?.display_name ? ' — ' + author.display_name : ''}`,
    description: pub.description || pub.subtitle || `Read "${pub.title}" free on ANYFREEBOOK.`,
    openGraph: {
      title: pub.title,
      description: pub.description || pub.subtitle || '',
      type: 'article',
      images: pub.cover_url ? [{ url: pub.cover_url }] : [{ url: `/api/og?title=${encodeURIComponent(pub.title)}&subtitle=${encodeURIComponent('by ' + (author?.display_name || 'an ANYFREEBOOK author'))}` }],
    },
  };
}

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default async function ReadPublicationPage({ params, searchParams }: { params: { slug: string }; searchParams: { ch?: string } }) {
  const data = await getPublicationBySlug(params.slug);
  if (!data) notFound();
  const { pub, author } = data;

  const chapters = await getPublishedChapters(pub.id);
  const chParam = parseInt(searchParams.ch || '', 10);
  const activeIdx = chapters.length > 0 && chParam >= 1 && chParam <= chapters.length ? chParam - 1 : null;
  const activeChapter = activeIdx !== null ? chapters[activeIdx] : null;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: pub.title,
    description: pub.description || pub.subtitle || '',
    author: { '@type': 'Person', name: author?.display_name || 'ANYFREEBOOK Author' },
    datePublished: pub.published_at,
    publisher: { '@type': 'Organization', name: 'ANYFREEBOOK' },
  };

  return (
    <article className="content-wrapper py-8 max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <ReadTracker slug={pub.slug} />

      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href="/" className="hover:text-[var(--text)]">Home</Link>
        <span>/</span>
        <Link href="/creators/discover" className="hover:text-[var(--text)]">Published</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)] line-clamp-1">{pub.title}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] uppercase">{pub.content_type}</span>
          <span className="text-xs text-[var(--text-muted)]">{pub.category}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--text)] leading-tight">{pub.title}</h1>
        {pub.subtitle && <p className="mt-2 text-lg text-[var(--text-secondary)]">{pub.subtitle}</p>}

        {/* Author byline */}
        <div className="flex items-center gap-3 mt-5 pb-5 border-b border-[var(--border-subtle)]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white font-bold">
            {(author?.display_name || 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {author?.creator_handle ? (
              <Link href={`/author/${author.creator_handle}`} className="text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)]">{author.display_name || 'Author'}</Link>
            ) : (
              <span className="text-sm font-semibold text-[var(--text)]">{author?.display_name || 'Author'}</span>
            )}
            <div className="text-[11px] text-[var(--text-muted)]">
              {fmt(author?.follower_count || 0)} readers · {fmt(pub.view_count)} reads · {fmt(pub.read_count)} verified reads
            </div>
          </div>
          {author && <FollowButton authorId={author.id} initialFollowers={author.follower_count || 0} size="sm" />}
        </div>
      </header>

      {pub.cover_url && (
        <img src={pub.cover_url} alt={pub.title} className="w-full rounded-2xl mb-6 max-h-[420px] object-cover" />
      )}

      <PublicationInteractions
        publicationId={pub.id}
        authorId={pub.author_id}
        initialLikes={pub.like_count}
        initialSaves={pub.save_count || 0}
        commentCount={pub.comment_count || 0}
        title={pub.title}
      />

      {/* Chapters TOC */}
      {chapters.length > 0 && (
        <div className="mb-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/read/${pub.slug}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeChapter === null ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
            >
              Overview
            </Link>
            {chapters.map((c, i) => (
              <Link
                key={c.id}
                href={`/read/${pub.slug}?ch=${i + 1}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeIdx === i ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
              >
                {i + 1}. {c.title.length > 24 ? c.title.slice(0, 22) + '…' : c.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reading surface with comfort settings */}
      <ReaderSurface>
        {activeChapter ? (
          <>
            <h2 className="text-2xl font-display font-bold text-[var(--text)] mb-6">
              Chapter {activeIdx! + 1}: {activeChapter.title}
            </h2>
            {activeChapter.body && <PublicationContent body={activeChapter.body} />}
          </>
        ) : (
          pub.body && <PublicationContent body={pub.body} />
        )}
      </ReaderSurface>

      {/* Chapter prev/next */}
      {chapters.length > 0 && (
        <div className="mt-8 flex items-center justify-between gap-3">
          {activeChapter && activeIdx! > 0 ? (
            <Link href={`/read/${pub.slug}?ch=${activeIdx!}`} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
              ← Ch. {activeIdx!}
            </Link>
          ) : activeChapter ? (
            <Link href={`/read/${pub.slug}`} className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors">
              ← Overview
            </Link>
          ) : <span />}
          {activeIdx === null && chapters.length > 0 ? (
            <Link href={`/read/${pub.slug}?ch=1`} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all">
              Start reading — Chapter 1 →
            </Link>
          ) : activeIdx !== null && activeIdx < chapters.length - 1 ? (
            <Link href={`/read/${pub.slug}?ch=${activeIdx + 2}`} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all">
              Next: Ch. {activeIdx + 2} →
            </Link>
          ) : <span />}
        </div>
      )}

      {/* Attached file: inline PDF viewer or download card */}
      {pub.external_url && (
        <div className="mt-8">
          {pub.external_url.toLowerCase().includes('.pdf') ? (
            <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
              <iframe
                src={pub.external_url}
                title={`${pub.title} (PDF)`}
                className="w-full bg-white"
                style={{ height: '75vh' }}
              />
              <div className="p-3 bg-[var(--surface)] text-center">
                <a href={pub.external_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                  Open full screen / download PDF →
                </a>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
              <p className="text-sm text-[var(--text-secondary)] mb-3">This work is also available as a downloadable file.</p>
              <a href={pub.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">
                Open / Download
              </a>
            </div>
          )}
        </div>
      )}

      {/* AI study aids */}
      <AiStudyAids slug={pub.slug} title={pub.title} />

      {/* Subtle footer ad — this is the revenue the pool shares from. Only
          appears after genuine reading time + scroll, dismissible, never
          inline in the text. */}
      <ReaderFooterAd slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOOK} />

      {/* Author card */}
      {author && (
        <div className="mt-10 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(author.display_name || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--text)]">{author.display_name || 'Author'}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{fmt(author.follower_count || 0)} readers</div>
              {author.creator_bio && <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{author.creator_bio}</p>}
            </div>
            <FollowButton authorId={author.id} initialFollowers={author.follower_count || 0} />
          </div>
        </div>
      )}

      {/* Comments */}
      <CommentsSection publicationId={pub.id} />

      {/* CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Are you a writer? </p>
        <Link href="/creators" className="text-sm font-semibold text-[var(--primary)] hover:underline">Publish your own work and earn on ANYFREEBOOK →</Link>
      </div>
    </article>
  );
}
