import { isPublicHttpsUrl } from '@/lib/safeUrl';

export const PLACEMENTS = ['support_line', 'tile', 'shelf'] as const;
export type Placement = (typeof PLACEMENTS)[number];

export interface SponsorLink { label: string; url: string }

export interface Sponsor {
  id: string;
  placement: Placement;
  sponsor_name: string;
  headline: string;
  body: string;
  link_url: string;
  cta_label: string;
  media_type: 'none' | 'image' | 'video';
  media_url: string;
  extra_links: SponsorLink[];
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Validates admin input. Every link must be a public https address, so no javascript: or data: URLs reach readers. */
export function parseSponsor(input: Record<string, unknown>): { error: string } | { value: Omit<Sponsor, 'id'> } {
  const placement = input.placement as Placement;
  if (!PLACEMENTS.includes(placement)) return { error: 'Choose a spot' };
  const sponsor_name = clip(input.sponsor_name, 80);
  if (!sponsor_name) return { error: 'Sponsor name is required' };
  const link_url = clip(input.link_url, 500);
  if (link_url && !isPublicHttpsUrl(link_url)) return { error: 'The main link must start with https://' };
  const media_url = clip(input.media_url, 500);
  if (media_url && !isPublicHttpsUrl(media_url)) return { error: 'The media link must start with https://' };
  const media_type = media_url ? (input.media_type === 'video' ? 'video' : 'image') : 'none';

  const extra_links: SponsorLink[] = [];
  for (const raw of (Array.isArray(input.extra_links) ? input.extra_links : []).slice(0, 6)) {
    const label = clip((raw as SponsorLink)?.label, 80);
    const url = clip((raw as SponsorLink)?.url, 500);
    if (!label && !url) continue;
    if (!label || !isPublicHttpsUrl(url)) return { error: 'Each extra link needs a label and an https:// address' };
    extra_links.push({ label, url });
  }

  const date = (v: unknown) => {
    const t = typeof v === 'string' && v ? Date.parse(v) : NaN;
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  };
  const starts_at = date(input.starts_at);
  const ends_at = date(input.ends_at);
  if (starts_at && ends_at && ends_at <= starts_at) return { error: 'End date must be after the start date' };

  return {
    value: {
      placement, sponsor_name, link_url, media_url, media_type, extra_links, starts_at, ends_at,
      headline: clip(input.headline, 100),
      body: clip(input.body, 240),
      cta_label: clip(input.cta_label, 30),
      active: input.active === true,
    },
  };
}
