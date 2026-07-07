import { createClient } from '@/lib/supabase/server';

/** Comma-separated list of emails allowed to view /admin. Defaults to the site owner. */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'michaelbanigo575@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<{ email: string; id: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) return null;
  return { email: user.email, id: user.id };
}
