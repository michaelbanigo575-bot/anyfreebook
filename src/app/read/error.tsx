'use client';

import { primaryButtonClass } from '@/lib/ui';

export default function ReadError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="content-wrapper py-20 text-center max-w-md mx-auto">
      <p className="text-5xl mb-4">⚠️</p>
      <h1 className="text-xl font-bold text-[var(--text)] mb-2">Couldn&apos;t load this publication</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Something went wrong loading this page — try again.</p>
      <button onClick={reset} className={primaryButtonClass()}>Try again</button>
    </div>
  );
}
