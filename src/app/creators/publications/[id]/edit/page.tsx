import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PublishForm } from '../../../PublishForm';
import type { Publication } from '@/lib/creators/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit Publication', robots: { index: false } };

export default async function EditPublicationPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/creators/dashboard');

  const { data: pub } = await supabase.from('publications').select('*').eq('id', params.id).single();
  if (!pub) notFound();
  if (pub.author_id !== user.id) redirect('/creators/dashboard');

  return (
    <div className="content-wrapper py-8">
      <h1 className="text-2xl font-display font-bold text-[var(--text)] text-center mb-8">Edit publication</h1>
      <PublishForm existing={pub as Publication} />
    </div>
  );
}
