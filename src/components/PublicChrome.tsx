'use client';

import { usePathname } from 'next/navigation';

/**
 * Hides its children on /admin routes. Used to wrap public-facing chrome
 * (Footer, PWA prompt, reading-reminder poller, BackButton) so the admin
 * dashboard renders on a clean slate.
 */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <>{children}</>;
}
