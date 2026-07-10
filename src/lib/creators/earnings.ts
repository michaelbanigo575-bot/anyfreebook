import type { ProgramConfig } from './types';

export interface EarningsEstimate {
  verifiedReadsThisMonth: number;
  qualified: boolean;
  readsToThreshold: number;
  followersToThreshold: number;
  estimatedThisMonth: number;   // USD, illustrative until real ad revenue exists
  estimatedLifetime: number;    // USD
  poolPercentage: number;
  minPayout: number;
}

/**
 * Illustrative earnings estimate for the author dashboard.
 *
 * Real payouts = each qualifying author's share of the 40% creator pool,
 * proportional to their verified read-time. Until live ad revenue exists we
 * surface an estimate derived from a configurable creator-pool RPM so authors
 * can see the mechanism and their trajectory. Clearly labelled "estimated".
 */
export function estimateEarnings(
  verifiedReadsThisMonth: number,
  lifetimeReads: number,
  followerCount: number,
  config: ProgramConfig
): EarningsEstimate {
  const qualified = verifiedReadsThisMonth >= config.monthly_read_threshold
    && followerCount >= config.monthly_follower_threshold;
  const estimatedThisMonth = qualified
    ? (verifiedReadsThisMonth / 1000) * config.estimated_rpm_usd
    : 0;
  const estimatedLifetime = (lifetimeReads / 1000) * config.estimated_rpm_usd;

  return {
    verifiedReadsThisMonth,
    qualified,
    readsToThreshold: Math.max(0, config.monthly_read_threshold - verifiedReadsThisMonth),
    followersToThreshold: Math.max(0, config.monthly_follower_threshold - followerCount),
    estimatedThisMonth: +estimatedThisMonth.toFixed(2),
    estimatedLifetime: +estimatedLifetime.toFixed(2),
    poolPercentage: config.pool_percentage,
    minPayout: config.min_payout_usd,
  };
}
