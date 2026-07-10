-- ANYFREEBOOK: chapters/serialization, file uploads, AI study-aid cache
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- 1. Chapters (Wattpad-style serialized releases)
create table if not exists public.chapters (
  id uuid default gen_random_uuid() primary key,
  publication_id uuid references public.publications(id) on delete cascade not null,
  title text not null,
  position int not null default 1,
  body text,
  status text default 'published' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  published_at timestamptz default now()
);
create index if not exists idx_chapters_pub on public.chapters(publication_id, position);

alter table public.chapters enable row level security;
drop policy if exists "published chapters public" on public.chapters;
create policy "published chapters public" on public.chapters for select
  using (
    status = 'published'
    or exists (select 1 from public.publications p where p.id = publication_id and p.author_id = auth.uid())
  );
drop policy if exists "authors manage chapters" on public.chapters;
create policy "authors manage chapters" on public.chapters for all
  using (exists (select 1 from public.publications p where p.id = publication_id and p.author_id = auth.uid()))
  with check (exists (select 1 from public.publications p where p.id = publication_id and p.author_id = auth.uid()));

-- 2. AI study-aid cache (generated once per publication+kind, served forever)
create table if not exists public.publication_ai (
  id uuid default gen_random_uuid() primary key,
  publication_id uuid references public.publications(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  kind text not null check (kind in ('summary', 'quiz')),
  content jsonb not null,
  model text,
  created_at timestamptz default now(),
  unique(publication_id, kind)
);
create index if not exists idx_pub_ai_pub on public.publication_ai(publication_id);
create index if not exists idx_pub_ai_author_day on public.publication_ai(author_id, created_at);

alter table public.publication_ai enable row level security;
drop policy if exists "ai results public" on public.publication_ai;
create policy "ai results public" on public.publication_ai for select using (true);
-- inserts happen via service role in the API route only

-- 3. Storage bucket for author-uploaded files (PDF/EPUB/audio)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'publications',
  'publications',
  true,
  20971520, -- 20 MB per file, protects the free tier
  array['application/pdf', 'application/epub+zip', 'audio/mpeg', 'audio/mp4', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf', 'application/epub+zip', 'audio/mpeg', 'audio/mp4', 'image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: authors upload into their own folder ({auth.uid()}/...), public can read
drop policy if exists "authors upload own files" on storage.objects;
create policy "authors upload own files" on storage.objects for insert
  with check (bucket_id = 'publications' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "authors update own files" on storage.objects;
create policy "authors update own files" on storage.objects for update
  using (bucket_id = 'publications' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "authors delete own files" on storage.objects;
create policy "authors delete own files" on storage.objects for delete
  using (bucket_id = 'publications' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "publication files public read" on storage.objects;
create policy "publication files public read" on storage.objects for select
  using (bucket_id = 'publications');
