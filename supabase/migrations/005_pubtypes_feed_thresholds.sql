-- ANYFREEBOOK: publication types, originality flag, higher payout thresholds, news/feed, view time-series
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- 0. Allow Word documents in the publications storage bucket (created in migration 004)
update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'application/epub+zip', 'audio/mpeg', 'audio/mp4',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'publications';

-- 1. Publication type + originality status
alter table public.publications add column if not exists publication_type text default 'article'
  check (publication_type in ('lecture_note', 'article', 'journal', 'licensed_publication', 'authored_work', 'poetry', 'story', 'guide'));
alter table public.publications add column if not exists originality_status text default 'unchecked'
  check (originality_status in ('unchecked', 'checked_clear', 'flagged', 'author_confirmed_licensed'));
alter table public.publications add column if not exists originality_notes text;

-- 2. Raise creator program thresholds (50k views, 2k followers, $100 min payout)
alter table public.creator_program_config add column if not exists monthly_follower_threshold int default 2000;

update public.creator_program_config
set monthly_read_threshold = 50000,
    monthly_follower_threshold = 2000,
    min_payout_usd = 100,
    updated_at = now()
where id = 1;

-- 3. Daily view-time-series for admin dashboard (books + publications + feed, lightweight log)
-- Created before the functions below so they can reference it.
create table if not exists public.view_events (
  id bigint generated always as identity primary key,
  source text not null check (source in ('publication', 'feed_post', 'book_search')),
  ref_id text,
  day date default current_date,
  created_at timestamptz default now()
);
create index if not exists idx_view_events_day on public.view_events(day);
create index if not exists idx_view_events_source_day on public.view_events(source, day);

alter table public.view_events enable row level security;
drop policy if exists "anyone logs view events" on public.view_events;
create policy "anyone logs view events" on public.view_events for insert with check (true);
-- reads happen via service role in admin only

-- 4. News / Feed — short-form posts (video link, article text, or file)
create table if not exists public.feed_posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  post_type text not null default 'article' check (post_type in ('article', 'video', 'file')),
  title text not null,
  body text,               -- article text
  video_url text,          -- youtube/vimeo/external link
  file_url text,           -- pdf/docx in Storage
  cover_url text,
  category text default 'General',
  status text default 'published' check (status in ('draft', 'published', 'removed')),
  view_count int default 0,
  like_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now(),
  published_at timestamptz default now()
);

create index if not exists idx_feed_posts_author on public.feed_posts(author_id);
create index if not exists idx_feed_posts_published on public.feed_posts(published_at desc);
create index if not exists idx_feed_posts_status on public.feed_posts(status);

alter table public.feed_posts enable row level security;
drop policy if exists "published feed posts are public" on public.feed_posts;
create policy "published feed posts are public" on public.feed_posts for select
  using (status = 'published' or auth.uid() = author_id);
drop policy if exists "authors insert own feed posts" on public.feed_posts;
create policy "authors insert own feed posts" on public.feed_posts for insert
  with check (auth.uid() = author_id);
drop policy if exists "authors update own feed posts" on public.feed_posts;
create policy "authors update own feed posts" on public.feed_posts for update
  using (auth.uid() = author_id);
drop policy if exists "authors delete own feed posts" on public.feed_posts;
create policy "authors delete own feed posts" on public.feed_posts for delete
  using (auth.uid() = author_id);

create or replace function public.increment_feed_view(post_id uuid)
returns void as $$
  update public.feed_posts set view_count = view_count + 1 where id = post_id and status = 'published';
  insert into public.view_events (source, ref_id) values ('feed_post', post_id::text);
$$ language sql security definer;

-- 5. Re-point the existing publication view counter (from migration 004) to also log a view_event
create or replace function public.increment_pub_view(pub_slug text)
returns void as $$
declare
  v_id uuid;
begin
  update public.publications set view_count = view_count + 1
    where slug = pub_slug and status = 'published'
    returning id into v_id;
  if v_id is not null then
    insert into public.view_events (source, ref_id) values ('publication', v_id::text);
  end if;
end;
$$ language plpgsql security definer;
