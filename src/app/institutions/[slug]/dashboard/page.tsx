import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionBySlug, getInstitutionPublications, getInstitutionClassrooms, getInstitutionComments, getMyRole } from '@/lib/institutions/server';
import type { InstitutionMember } from '@/lib/institutions/client';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Institution Dashboard', robots: { index: false } };

export default async function InstitutionDashboardPage({ params }: { params: { slug: string } }) {
  const institution = await getInstitutionBySlug(params.slug);
  if (!institution) notFound();

  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?redirect=/institutions/${params.slug}/dashboard`);

  const role = await getMyRole(institution.id, user.id);
  if (!role || !['owner', 'admin', 'teacher'].includes(role)) redirect(`/institutions/${params.slug}`);

  const { data: membersRaw } = await sb
    .from('institution_members')
    .select('*, profile:profiles(display_name, email, avatar_url)')
    .eq('institution_id', institution.id)
    .order('joined_at', { ascending: true });

  const [publications, classrooms, comments, templates] = await Promise.all([
    getInstitutionPublications(institution.id),
    getInstitutionClassrooms(institution.id),
    getInstitutionComments(institution.id, 30),
    (async () => {
      const { data } = await sb.from('study_plan_templates').select('*').eq('institution_id', institution.id).order('created_at', { ascending: false });
      return data || [];
    })(),
  ]);

  return (
    <DashboardClient
      institution={institution}
      myRole={role}
      initialMembers={(membersRaw as unknown as InstitutionMember[]) || []}
      publications={publications}
      classrooms={classrooms}
      comments={comments}
      templates={templates}
    />
  );
}
