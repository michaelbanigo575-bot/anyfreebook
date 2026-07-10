export interface Publication {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  category: string;
  content_type: 'article' | 'book' | 'poetry' | 'guide' | 'story';
  publication_type?: PublicationType;
  originality_status?: OriginalityStatus;
  body: string | null;
  external_url: string | null;
  status: 'draft' | 'published' | 'removed';
  view_count: number;
  read_count: number;
  total_read_seconds: number;
  like_count: number;
  save_count?: number;
  comment_count?: number;
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

export type PublicationType = 'lecture_note' | 'article' | 'journal' | 'licensed_publication' | 'authored_work' | 'poetry' | 'story' | 'guide';
export type OriginalityStatus = 'unchecked' | 'checked_clear' | 'flagged' | 'author_confirmed_licensed';

export const PUBLICATION_TYPES: { id: PublicationType; label: string; hint: string }[] = [
  { id: 'authored_work', label: 'Authored Work', hint: 'Original writing you created yourself' },
  { id: 'lecture_note', label: 'Lecture Note', hint: 'Teaching material for a course or class' },
  { id: 'article', label: 'Article', hint: 'Short-form original writing' },
  { id: 'journal', label: 'Journal / Research', hint: 'Academic or research writing' },
  { id: 'licensed_publication', label: 'Licensed Publication', hint: "You hold the rights to publish this — you'll confirm licensing" },
  { id: 'poetry', label: 'Poetry', hint: 'Original poems' },
  { id: 'story', label: 'Story / Fiction', hint: 'Original fiction' },
  { id: 'guide', label: 'Guide / How-to', hint: 'Instructional writing' },
];

export interface CreatorProfile {
  id: string;
  display_name: string | null;
  creator_handle: string | null;
  creator_bio: string | null;
  creator_tier: string;
  avatar_url: string | null;
  creator_joined_at: string | null;
  follower_count?: number;
}

export interface ProgramConfig {
  pool_percentage: number;
  platform_percentage: number;
  monthly_read_threshold: number;
  monthly_follower_threshold: number;
  min_payout_usd: number;
  estimated_rpm_usd: number;
}

export const DEFAULT_CONFIG: ProgramConfig = {
  pool_percentage: 40,
  platform_percentage: 60,
  monthly_read_threshold: 50000,
  monthly_follower_threshold: 2000,
  min_payout_usd: 100,
  estimated_rpm_usd: 1.2,
};

export interface CreatorTier {
  id: string;
  label: string;
  minReads: number;
  color: string;
  perk: string;
}

export const CREATOR_TIERS: CreatorTier[] = [
  { id: 'bronze', label: 'Bronze', minReads: 0, color: 'from-orange-700 to-amber-800', perk: 'Publish unlimited works' },
  { id: 'silver', label: 'Silver', minReads: 5000, color: 'from-slate-400 to-slate-500', perk: '+ Featured in discovery' },
  { id: 'gold', label: 'Gold', minReads: 50000, color: 'from-amber-400 to-yellow-500', perk: '+ Priority payout & homepage spots' },
  { id: 'platinum', label: 'Platinum', minReads: 250000, color: 'from-cyan-300 to-indigo-400', perk: '+ Revenue-share bonus & verified badge' },
];

export function tierForReads(totalReads: number): CreatorTier {
  let current = CREATOR_TIERS[0];
  for (const t of CREATOR_TIERS) {
    if (totalReads >= t.minReads) current = t;
  }
  return current;
}
