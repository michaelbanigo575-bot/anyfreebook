import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionBySlug, getInstitutionPublications, getInstitutionClassrooms, getMyRole } from '@/lib/institutions/server';
import { InstitutionJoin } from './JoinAndMembers';
import { cardClass } from '@/lib/ui';

const TYPE_LABEL: Record<string, string> = {
  school: '🏫 School', university: '🎓 University', library: '📚 Library', ngo: '🤝 NGO', other: '🏢 Organization',
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const institution = await getInstitutionBySlug(params.slug);
  if (!institution) return {};
  return {
    title: `${institution.name} — ANYFREEBOOK`,
    description: institution.description || `${institution.name} on ANYFREEBOOK — free books, classes, and reading programs.`,
  };
}

export default async function InstitutionProfilePage({ params }: { params: { slug: string } }) {
  const institution = await getInstitutionBySlug(params.slug);
  if (!institution) notFound();

  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [publications, classrooms, myRole] = await Promise.all([
    getInstitutionPublications(institution.id),
    getInstitutionClassrooms(institution.id),
    getMyRole(institution.id, user?.id),
  ]);

  const published = publications.filter(p => p.status === 'published');
  const upcomingClasses = classrooms.filter(c => c.status !== 'ended');

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
            {institution.logo_url ? <img src={institution.logo_url} alt="" className="w-full h-full object-cover" /> : TYPE_LABEL[institution.type]?.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">
              {institution.name}{institution.verified && <span className="ml-1.5 text-[var(--primary)]">✓</span>}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {TYPE_LABEL[institution.type] || institution.type} · {institution.member_count} member{institution.member_count === 1 ? '' : 's'}
              {institution.country ? ` · ${institution.country}` : ''}
            </p>
          </div>
        </div>
        {myRole && (
          <Link href={`/institutions/${institution.slug}/dashboard`} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap">
            Go to dashboard
          </Link>
        )}
      </div>

      <InstitutionJoin
        institutionId={institution.id}
        slug={institution.slug}
        initialRole={myRole}
      />

      {institution.description && <p className="text-[var(--text-secondary)] mb-8 max-w-2xl">{institution.description}</p>}
      {institution.website && (
        <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] hover:underline mb-8 inline-block">
          {institution.website.replace(/^https?:\/\//, '')} ↗
        </a>
      )}

      {upcomingClasses.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Classes</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {upcomingClasses.map(c => (
              <Link key={c.id} href={`/class/${c.room_code}`} className={c.status === 'live' ? `${cardClass({ hover: false })} border-red-500/40 hover:shadow-[var(--shadow-md)]` : cardClass({ padding: 'p-4' })}>
                <h3 className="font-bold text-[var(--text)] line-clamp-2">{c.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {c.status === 'live' ? '🔴 Live now' : new Date(c.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Publications</h2>
        {published.length === 0 ? (
          <div className={`${cardClass({ hover: false, padding: 'p-10' })} text-center`}>
            <p className="text-4xl mb-3">📖</p>
            <p className="font-semibold text-[var(--text)]">Nothing published yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {published.map(p => (
              <Link key={p.id} href={`/read/${p.slug}`} className={cardClass({ padding: 'p-4' })}>
                <h3 className="text-sm font-bold text-[var(--text)] line-clamp-2">{p.title}</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{p.category} · 👁 {p.view_count} · ❤ {p.like_count}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
