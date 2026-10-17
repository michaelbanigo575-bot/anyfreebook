import type { Metadata } from 'next';
import Link from 'next/link';
import { listInstitutions } from '@/lib/institutions/server';
import { cardClass } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Institutions — Schools, Universities & Libraries on ANYFREEBOOK',
  description: 'Schools, universities, libraries, and NGOs using ANYFREEBOOK to manage classes, assign free reading, and publish under their own name — completely free.',
};

const TYPE_LABEL: Record<string, string> = {
  school: '🏫 School', university: '🎓 University', library: '📚 Library', ngo: '🤝 NGO', other: '🏢 Organization',
};

export default async function InstitutionsPage() {
  const institutions = await listInstitutions();

  return (
    <div className="content-wrapper py-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">🏛 Institutions</h1>
          <p className="text-[var(--text-muted)] mt-1">Schools, universities, libraries and NGOs building free reading and classes on ANYFREEBOOK.</p>
        </div>
        <Link href="/institutions/new" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap">
          + Add your institution
        </Link>
      </div>

      {institutions.length === 0 ? (
        <div className={`${cardClass({ hover: false, padding: 'p-10' })} text-center`}>
          <p className="text-4xl mb-3">🏛</p>
          <p className="font-semibold text-[var(--text)]">No institutions yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">Be the first school, university, or library to join — completely free.</p>
          <Link href="/institutions/new" className="inline-flex px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold">Add your institution</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {institutions.map(i => (
            <Link key={i.id} href={`/institutions/${i.slug}`} className={cardClass()}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                  {i.logo_url ? <img src={i.logo_url} alt="" className="w-full h-full object-cover" /> : TYPE_LABEL[i.type]?.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[var(--text)] truncate">{i.name}{i.verified && <span className="ml-1 text-[var(--primary)]">✓</span>}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{TYPE_LABEL[i.type] || i.type} · {i.member_count} member{i.member_count === 1 ? '' : 's'}</p>
                </div>
              </div>
              {i.description && <p className="text-sm text-[var(--text-secondary)] mt-3 line-clamp-2">{i.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
