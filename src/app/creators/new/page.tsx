import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PublishForm } from '../PublishForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New Publication', robots: { index: false } };

export default async function NewPublicationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/creators/new');

  const { data: profile } = await supabase.from('profiles').select('is_creator').eq('id', user.id).single();
  if (!profile?.is_creator) redirect('/creators/dashboard');

  return (
    <div className="content-wrapper py-8">
      <h1 className="text-2xl font-display font-bold text-[var(--text)] text-center mb-8">New publication</h1>
      <PublishForm />
    </div>
  );
}
