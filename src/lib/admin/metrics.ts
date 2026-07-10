import { createServiceClient } from '@/lib/supabase/server';

export interface UserMetrics {
  totalUsers: number;
  newToday: number;
  newThisWeek: number;
  premiumUsers: number;
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  activeStudyPlans: number;
  totalCollections: number;
  publicCollections: number;
  totalReferrals: number;
  connected: boolean;
  hint?: string;
  signupSeries: { day: string; count: number }[];
}

export interface RecentSignup {
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export async function getUserMetrics(): Promise<UserMetrics> {
  try {
    const sb = createServiceClient();
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [profilesTotal, profilesToday, profilesWeek, premium, interactions, studyPlans, collections, publicCol, referrals, actionRows, signupRows] = await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }),
      sb.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
      sb.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
      sb.from('book_interactions').select('id', { count: 'exact', head: true }),
      sb.from('study_plans').select('id', { count: 'exact', head: true }).eq('enabled', true),
      sb.from('collections').select('id', { count: 'exact', head: true }),
      sb.from('collections').select('id', { count: 'exact', head: true }).eq('is_public', true),
      sb.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'signed_up'),
      sb.from('book_interactions').select('action').limit(5000),
      sb.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: true }).limit(5000),
    ]);

    const interactionsByType: Record<string, number> = {};
    for (const row of (actionRows.data || [])) {
      const a = (row as { action: string }).action;
      interactionsByType[a] = (interactionsByType[a] ?? 0) + 1;
    }

    // Bucket signups into daily counts for a 30-day sparkline
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const row of (signupRows.data || [])) {
      const day = ((row as { created_at: string }).created_at).slice(0, 10);
      if (day in buckets) buckets[day]++;
    }
    const signupSeries = Object.entries(buckets).map(([day, count]) => ({ day, count }));

    return {
      totalUsers: profilesTotal.count || 0,
      newToday: profilesToday.count || 0,
      newThisWeek: profilesWeek.count || 0,
      premiumUsers: premium.count || 0,
      totalInteractions: interactions.count || 0,
      interactionsByType,
      activeStudyPlans: studyPlans.count || 0,
      totalCollections: collections.count || 0,
      publicCollections: publicCol.count || 0,
      totalReferrals: referrals.count || 0,
      connected: true,
      signupSeries,
    };
  } catch (err) {
    return {
      totalUsers: 0, newToday: 0, newThisWeek: 0, premiumUsers: 0, totalInteractions: 0,
      interactionsByType: {}, activeStudyPlans: 0, totalCollections: 0, publicCollections: 0,
      totalReferrals: 0, connected: false, signupSeries: [],
      hint: err instanceof Error ? err.message : 'Supabase service query failed',
    };
  }
}

export interface ViewMetrics {
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  dailySeries: { day: string; count: number }[];
  connected: boolean;
}

export async function getViewMetrics(): Promise<ViewMetrics> {
  try {
    const sb = createServiceClient();
    const now = Date.now();
    const todayStr = new Date(now).toISOString().slice(0, 10);
    const yesterdayStr = new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [todayCount, yesterdayCount, weekCount, monthRows] = await Promise.all([
      sb.from('view_events').select('id', { count: 'exact', head: true }).eq('day', todayStr),
      sb.from('view_events').select('id', { count: 'exact', head: true }).eq('day', yesterdayStr),
      sb.from('view_events').select('id', { count: 'exact', head: true }).gte('day', sevenDaysAgo),
      sb.from('view_events').select('day').gte('day', thirtyDaysAgo).limit(50000),
    ]);

    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const key = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    for (const row of (monthRows.data || [])) {
      const day = (row as { day: string }).day;
      if (day in buckets) buckets[day]++;
    }
    const dailySeries = Object.entries(buckets).map(([day, count]) => ({ day, count }));

    return {
      today: todayCount.count || 0,
      yesterday: yesterdayCount.count || 0,
      last7Days: weekCount.count || 0,
      last30Days: dailySeries.reduce((a, d) => a + d.count, 0),
      dailySeries,
      connected: true,
    };
  } catch {
    return { today: 0, yesterday: 0, last7Days: 0, last30Days: 0, dailySeries: [], connected: false };
  }
}

export async function getRecentSignups(limit = 15): Promise<RecentSignup[]> {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from('profiles')
      .select('email, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as RecentSignup[]) || [];
  } catch {
    return [];
  }
}
