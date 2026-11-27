import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/guard';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from './AdminShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Admin — ANYFREEBOOK',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    // The sign-in page sends signed-in people straight back, so only send visitors there.
    // Anyone signed in without admin access goes home, or the two pages would loop.
    const { data: { user } } = await createClient().auth.getUser();
    redirect(user ? '/' : '/login?redirect=/admin');
  }

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
