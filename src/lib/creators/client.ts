'use client';

import { createClient } from '@/lib/supabase/client';
import type { Publication } from './types';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
}

/** Turn the current user into a creator (idempotent). Generates a handle from display name/email. */
export async function becomeCreator(handleSeed: string, bio: string): Promise<{ error: string | null; handle?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  let handle = slugify(handleSeed) || `author-${user.id.slice(0, 6)}`;
  // Ensure uniqueness with a short suffix if needed
  const { data: existing } = await sb.from('profiles').select('id').eq('creator_handle', handle).maybeSingle();
  if (existing && existing.id !== user.id) handle = `${handle}-${user.id.slice(0, 4)}`;

  const { error } = await sb.from('profiles').update({
    is_creator: true,
    creator_handle: handle,
    creator_bio: bio || null,
    creator_joined_at: new Date().toISOString(),
  }).eq('id', user.id);

  if (error) return { error: error.message };
  return { error: null, handle };
}

export async function createPublication(input: {
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  contentType?: Publication['content_type'];
  body?: string;
  coverUrl?: string;
  externalUrl?: string;
  publish?: boolean;
}): Promise<{ error: string | null; slug?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  if (!input.title.trim()) return { error: 'Title is required' };

  const slug = `${slugify(input.title)}-${Math.random().toString(36).slice(2, 7)}`;

  const { error } = await sb.from('publications').insert({
    author_id: user.id,
    title: input.title.trim(),
    slug,
    subtitle: input.subtitle || null,
    description: input.description || null,
    category: input.category || 'General',
    content_type: input.contentType || 'article',
    body: input.body || null,
    cover_url: input.coverUrl || null,
    external_url: input.externalUrl || null,
    status: input.publish ? 'published' : 'draft',
    published_at: input.publish ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };
  return { error: null, slug };
}

export async function updatePublication(id: string, patch: Partial<Publication> & { publish?: boolean }): Promise<{ error: string | null }> {
  const sb = createClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['title', 'subtitle', 'description', 'category', 'content_type', 'body', 'cover_url', 'external_url'] as const) {
    if (patch[k] !== undefined) update[k] = patch[k];
  }
  if (patch.publish !== undefined) {
    update.status = patch.publish ? 'published' : 'draft';
    if (patch.publish) update.published_at = new Date().toISOString();
  }
  const { error } = await sb.from('publications').update(update).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deletePublication(id: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('publications').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Stable-ish per-browser key for anonymous read de-duplication. */
export function getSessionKey(): string {
  if (typeof window === 'undefined') return 'server';
  let key = localStorage.getItem('afb_session_key');
  if (!key) {
    key = 'sk_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('afb_session_key', key);
  }
  return key;
}

/** Bump the raw view counter once per page open. */
export async function recordView(slug: string): Promise<void> {
  try {
    const sb = createClient();
    await sb.rpc('increment_pub_view', { pub_slug: slug });
  } catch {}
}

/** Record engagement; the DB function decides if it's a verified read (>=30s & >=50% scroll). */
export async function recordRead(slug: string, seconds: number, scrollPct: number): Promise<void> {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    await sb.rpc('record_pub_read', {
      p_slug: slug,
      p_session: getSessionKey(),
      p_seconds: Math.round(seconds),
      p_scroll: Math.round(scrollPct),
      p_reader: user?.id ?? null,
    });
  } catch {}
}
