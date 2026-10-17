'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createInstitution } from '@/lib/institutions/client';
import type { Institution } from '@/lib/institutions/client';

const TYPES: { id: Institution['type']; label: string }[] = [
  { id: 'school', label: '🏫 School' },
  { id: 'university', label: '🎓 University' },
  { id: 'library', label: '📚 Library' },
  { id: 'ngo', label: '🤝 NGO' },
  { id: 'other', label: '🏢 Other' },
];

export default function NewInstitutionPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<Institution['type']>('school');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && !user) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🏛</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Sign in to add your institution</h1>
        <a href="/login?redirect=/institutions/new" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign In</a>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Give your institution a name.'); return; }
    setSaving(true);
    const { error, slug } = await createInstitution({ name, type, description, website, country });
    setSaving(false);
    if (error) { setError(error); return; }
    router.push(`/institutions/${slug}/dashboard`);
  };

  return (
    <div className="content-wrapper py-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-[var(--text)] mb-1">🏛 Add your institution</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Free forever — manage members, assign reading, host classes, and publish under your institution&apos;s name.</p>

      <div className="space-y-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Institution name"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] font-semibold outline-none focus:border-[var(--primary)]"
        />

        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${type === t.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does your institution do? (optional)"
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] resize-none"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="Website (optional)"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
          />
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Country (optional)"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
          />
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={submit} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60">
          {saving ? 'Creating…' : 'Create institution'}
        </button>

        <p className="text-[11px] text-[var(--text-muted)] text-center">
          You&apos;ll be the owner. Invite teachers, admins, and students from your dashboard — all free.
        </p>
      </div>
    </div>
  );
}
