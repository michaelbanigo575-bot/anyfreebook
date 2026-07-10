import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChaptersManager } from './ChaptersManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chapters', robots: { index: false } };

export default async function ChaptersPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/creators/dashboard');

  const { data: pub } = await supabase.from('publications').select('id, title, slug, author_id').eq('id', params.id).single();
  if (!pub) notFound();
  if (pub.author_id !== user.id) redirect('/creators/dashboard');

  return (
    <div className="content-wrapper py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Chapters — serialized releases</p>
        <h1 className="text-2xl font-display font-bold text-[var(--text)] mt-1">{pub.title}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Release your work chapter by chapter to keep readers coming back. Readers see published chapters in order; drafts stay private.
        </p>
      </div>
      <ChaptersManager publicationId={pub.id} slug={pub.slug} />
    </div>
  );
}
