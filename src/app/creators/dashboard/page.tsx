import { createClient } from '@/lib/supabase/server';
import { getCreatorDashboard, getProgramConfig } from '@/lib/creators/server';
import { estimateEarnings } from '@/lib/creators/earnings';
import { tierForReads } from '@/lib/creators/types';
import { BecomeCreator } from '../BecomeCreator';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Creator Dashboard', robots: { index: false } };

export default async function CreatorDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const config = await getProgramConfig();

  if (!user) {
    return <div className="content-wrapper py-8"><BecomeCreator config={config} /></div>;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_creator, creator_handle, creator_bio, display_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_creator) {
    return <div className="content-wrapper py-8"><BecomeCreator config={config} /></div>;
  }

  const dash = await getCreatorDashboard(user.id);
  const earnings = estimateEarnings(dash.verifiedReadsThisMonth, dash.totalReads, dash.followerCount, config);
  const tier = tierForReads(dash.totalReads);

  return (
    <DashboardClient
      handle={profile.creator_handle}
      displayName={profile.display_name}
      pubs={dash.pubs}
      stats={{ totalViews: dash.totalViews, totalReads: dash.totalReads, totalReadSeconds: dash.totalReadSeconds, totalLikes: dash.totalLikes, followerCount: dash.followerCount }}
      earnings={earnings}
      tier={tier}
      config={config}
    />
  );
}
