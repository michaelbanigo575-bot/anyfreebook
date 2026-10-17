'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { joinViaInvite } from '@/lib/institutions/client';

export default function JoinInstitutionPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user || status !== 'idle') return;
    setStatus('joining');
    joinViaInvite(params.token).then(({ error, institutionSlug }) => {
      if (error) { setError(error); setStatus('error'); return; }
      router.push(`/institutions/${institutionSlug}`);
    });
  }, [loading, user, status, params.token, router]);

  if (!loading && !user) {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">🏛</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Sign in to join</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">You&apos;ve been invited to join an institution on ANYFREEBOOK.</p>
        <a href={`/login?redirect=/institutions/join/${params.token}`} className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign In</a>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="content-wrapper py-20 text-center max-w-md mx-auto">
        <p className="text-5xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Couldn&apos;t join</h1>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="content-wrapper py-20 text-center max-w-md mx-auto">
      <p className="text-5xl mb-4">🏛</p>
      <p className="text-[var(--text-muted)]">Joining…</p>
    </div>
  );
}
