'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { becomeCreator } from '@/lib/creators/client';

export function BecomeCreator({ config }: { config: { pool_percentage: number; monthly_read_threshold: number; monthly_follower_threshold: number; min_payout_usd: number } }) {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-5xl mb-4">✍️</p>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Sign in to start publishing</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Create your author account and start earning from your writing.</p>
        <a href="/login?redirect=/creators/dashboard" className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold">Sign in</a>
      </div>
    );
  }

  const join = async () => {
    setError(null);
    const seed = handle.trim() || profile?.display_name || user.email?.split('@')[0] || 'author';
    setSaving(true);
    const { error } = await becomeCreator(seed, bio);
    setSaving(false);
    if (error) { setError(error); return; }
    await refreshProfile();
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="text-center mb-8">
        <p className="text-5xl mb-3">🚀</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-[var(--text)]">Become an ANYFREEBOOK author</h1>
        <p className="text-[var(--text-muted)] mt-2">Publish your work, reach millions of readers, and earn from the creator pool.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--primary)]">{config.pool_percentage}%</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">revenue share pool</div>
        </div>
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--primary)]">∞</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">works you can post</div>
        </div>
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--primary)]">${config.min_payout_usd}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">min. payout</div>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold text-[var(--text)] mb-1.5 block">Author handle</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-[var(--text-muted)]">anyfreebook.com/author/</span>
            <input
              value={handle}
              onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={profile?.display_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourname'}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-[var(--text)] mb-1.5 block">Bio (optional)</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell readers about yourself"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:border-[var(--primary)] resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={join}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
        >
          {saving ? 'Creating your author account…' : 'Create author account — free'}
        </button>
        <p className="text-[11px] text-[var(--text-muted)] text-center">
          By joining you agree to the Creator Program terms. Payouts begin once you pass {config.monthly_read_threshold.toLocaleString()} verified reads/month, {config.monthly_follower_threshold.toLocaleString()} followers, and reach the ${config.min_payout_usd} minimum.
        </p>
      </div>
    </div>
  );
}
