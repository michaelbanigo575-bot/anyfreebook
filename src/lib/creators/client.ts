'use client';

import { createClient } from '@/lib/supabase/client';
import { pingIndexNow } from '@/lib/indexnow';
import type { Publication, PublicationType, OriginalityStatus } from './types';

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
  publicationType?: PublicationType;
  originalityStatus?: OriginalityStatus;
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
    publication_type: input.publicationType || 'authored_work',
    originality_status: input.originalityStatus || 'unchecked',
    body: input.body || null,
    cover_url: input.coverUrl || null,
    external_url: input.externalUrl || null,
    status: input.publish ? 'published' : 'draft',
    published_at: input.publish ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };
  if (input.publish) void pingIndexNow([`https://anyfreebook.com/read/${slug}`]);
  return { error: null, slug };
}

export async function updatePublication(id: string, patch: Partial<Publication> & { publish?: boolean; slug?: string }): Promise<{ error: string | null }> {
  const sb = createClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['title', 'subtitle', 'description', 'category', 'content_type', 'publication_type', 'originality_status', 'body', 'cover_url', 'external_url'] as const) {
    if (patch[k] !== undefined) update[k] = patch[k];
  }
  if (patch.publish !== undefined) {
    update.status = patch.publish ? 'published' : 'draft';
    if (patch.publish) update.published_at = new Date().toISOString();
  }
  const { error } = await sb.from('publications').update(update).eq('id', id);
  if (!error && patch.publish && patch.slug) void pingIndexNow([`https://anyfreebook.com/read/${patch.slug}`]);
  return { error: error?.message ?? null };
}

export async function deletePublication(id: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('publications').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export interface Chapter {
  id: string;
  publication_id: string;
  title: string;
  position: number;
  body: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
}

export async function listChapters(publicationId: string): Promise<Chapter[]> {
  const sb = createClient();
  const { data } = await sb.from('chapters').select('*').eq('publication_id', publicationId).order('position');
  return (data as Chapter[]) || [];
}

export async function createChapter(publicationId: string, title: string, body: string, publish: boolean): Promise<{ error: string | null }> {
  const sb = createClient();
  const { data: existing } = await sb.from('chapters').select('position').eq('publication_id', publicationId).order('position', { ascending: false }).limit(1);
  const position = ((existing?.[0]?.position as number) || 0) + 1;
  const { error } = await sb.from('chapters').insert({
    publication_id: publicationId,
    title: title.trim(),
    body,
    position,
    status: publish ? 'published' : 'draft',
    published_at: publish ? new Date().toISOString() : null,
  });
  return { error: error?.message ?? null };
}

export async function updateChapter(id: string, patch: Partial<Pick<Chapter, 'title' | 'body' | 'status' | 'position'>>): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('chapters').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteChapter(id: string): Promise<{ error: string | null }> {
  const sb = createClient();
  const { error } = await sb.from('chapters').delete().eq('id', id);
  return { error: error?.message ?? null };
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // matches the bucket's 20MB limit

/** Upload a PDF/EPUB/Word/audio file to the author's folder in Supabase Storage. Returns a public URL. */
export async function uploadPublicationFile(file: File): Promise<{ error: string | null; url?: string }> {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not signed in' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'File is too large (max 20 MB).' };

  const allowed = [
    'application/pdf',
    'application/epub+zip',
    'audio/mpeg',
    'audio/mp4',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!allowed.includes(file.type)) return { error: 'Only PDF, EPUB, Word (.doc/.docx) or MP3/M4A files are allowed.' };

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-80);
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error } = await sb.storage.from('publications').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = sb.storage.from('publications').getPublicUrl(path);
  return { error: null, url: data.publicUrl };
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
