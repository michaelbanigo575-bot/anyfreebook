'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signUp, signIn, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const referralCode = searchParams.get('ref') || undefined;

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle(referralCode);
    if (result.error) {
      setError(result.error);
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google, so no further action needed here
  };

  useEffect(() => {
    if (user) router.push('/profile');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const result = await signUp(email, password, referralCode);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else if (result.needsConfirmation) {
        setAwaitingConfirmation(true);
      } else {
        router.push('/profile');
      }
      return;
    }

    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/profile');
    }
  };

  if (awaitingConfirmation) {
    return (
      <div className="content-wrapper py-16 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md text-center">
          <p className="text-5xl mb-4">📧</p>
          <h1 className="text-2xl font-display font-bold text-[var(--text)] mb-2">Check your email</h1>
          <p className="text-sm text-[var(--text-muted)]">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
          </p>
          <button
            onClick={() => { setAwaitingConfirmation(false); setMode('signin'); }}
            className="mt-6 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper py-16 flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--text)]">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {mode === 'signup' ? 'Sync your library across every device' : 'Sign in to sync your library across devices'}
          </p>
          {referralCode && mode === 'signup' && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              🎁 You were referred by a friend — you&apos;ll both get bonus points!
            </p>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-[var(--bg-secondary)] p-1 mb-6">
          <button
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'signin' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-medium hover:bg-[var(--surface-hover)] hover:border-[var(--primary)] transition-all disabled:opacity-60"
        >
          {googleLoading ? (
            <span className="text-sm">Redirecting to Google…</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">or with email</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Email/password form */}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all placeholder:text-[var(--text-muted)]"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password (min. 6 characters)"
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all placeholder:text-[var(--text-muted)]"
          />

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          By continuing you agree to our{' '}
          <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
