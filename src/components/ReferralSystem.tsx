'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';

const TIERS = {
  reader: { label: 'Reader', min: 0, color: 'text-gray-600', bg: 'bg-gray-100', next: 'advocate', nextAt: 5 },
  advocate: { label: 'Book Advocate', min: 5, color: 'text-blue-600', bg: 'bg-blue-100', next: 'ambassador', nextAt: 25 },
  ambassador: { label: 'Ambassador', min: 25, color: 'text-purple-600', bg: 'bg-purple-100', next: 'champion', nextAt: 100 },
  champion: { label: 'Champion', min: 100, color: 'text-amber-600', bg: 'bg-amber-100', next: null, nextAt: null },
} as const;

function tierForCount(referrals: number): keyof typeof TIERS {
  if (referrals >= 100) return 'champion';
  if (referrals >= 25) return 'ambassador';
  if (referrals >= 5) return 'advocate';
  return 'reader';
}

export function ReferralSystem() {
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Remember who referred a visitor so signup can credit them later
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref && !localStorage.getItem('afb_referred_by')) {
      localStorage.setItem('afb_referred_by', ref);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .then(({ count }) => setReferralCount(count || 0));
  }, [user, supabase]);

  if (loading) return null;

  // Signed out: referrals can't be tracked without an account, so invite sign-up
  if (!user || !profile?.referral_code) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] px-6 py-5 text-white">
          <h3 className="text-lg font-bold">Spread the word, earn rewards</h3>
          <p className="text-sm opacity-90 mt-1">Share free books with friends and level up</p>
        </div>
        <div className="p-6 text-center">
          <p className="text-4xl mb-3">🎁</p>
          <p className="text-sm font-semibold text-[var(--text)]">Sign in to get your referral link</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Every friend who joins with your link counts toward your tier — tracked on your account, on every device.
          </p>
          <a
            href="/login"
            className="inline-flex px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white text-sm font-semibold hover:shadow-lg transition-all"
          >
            Sign in / Create account
          </a>
        </div>
      </div>
    );
  }

  const tierKey = tierForCount(referralCount);
  const tier = TIERS[tierKey];
  const nextTier = tier.next ? TIERS[tier.next as keyof typeof TIERS] : null;
  const progress = nextTier && tier.nextAt ? (referralCount / tier.nextAt) * 100 : 100;
  const referralUrl = `https://anyfreebook.com/login?ref=${profile.referral_code}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = `Hey! I found this amazing site with 5M+ free books — textbooks, novels, everything, all legal and free. Check it out:`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg + '\n' + referralUrl)}`, '_blank');
  };

  const shareTwitter = () => {
    const msg = `I read free books on ANYFREEBOOK — 5M+ titles from Open Library, Gutenberg, Internet Archive & more. No catch.`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(referralUrl)}`, '_blank');
  };

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] px-6 py-5 text-white">
        <h3 className="text-lg font-bold">Spread the word, earn rewards</h3>
        <p className="text-sm opacity-90 mt-1">Share free books with friends and level up</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Tier badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full ${tier.bg} ${tier.color} text-sm font-bold`}>
            {tier.label}
          </div>
          {nextTier && (
            <div className="flex-1">
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>{referralCount} referrals</span>
                <span>{tier.nextAt} for {nextTier.label}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-secondary)]">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Referral code */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-sm text-[var(--text)] truncate">
            {referralUrl}
          </div>
          <button
            onClick={copyCode}
            className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        {/* Quick share */}
        <div className="flex gap-2">
          <button onClick={shareWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:opacity-90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </button>
          <button onClick={shareTwitter} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1DA1F2] text-white text-sm font-medium hover:opacity-90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="text-center">
            <p className="text-xl font-bold text-[var(--text)]">{referralCount}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Referrals</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-600">{profile.referral_code}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Your code</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-[var(--text)]">{tier.label}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Your tier</p>
          </div>
        </div>
      </div>
    </div>
  );
}
