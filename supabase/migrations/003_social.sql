-- ANYFREEBOOK Creator social layer: follows, likes, comments, saves
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- Counters on the aggregate tables
alter table public.profiles add column if not exists follower_count int default 0;
alter table public.publications add column if not exists comment_count int default 0;
alter table public.publications add column if not exists save_count int default 0;

-- 1. Author follows
create table if not exists public.author_follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, author_id),
  check (follower_id <> author_id)
);
create index if not exists idx_follows_author on public.author_follows(author_id);
create index if not exists idx_follows_follower on public.author_follows(follower_id);

-- 2. Publication likes
create table if not exists public.publication_likes (
  id uuid default gen_random_uuid() primary key,
  publication_id uuid references public.publications(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(publication_id, user_id)
);
create index if not exists idx_pub_likes_pub on public.publication_likes(publication_id);
create index if not exists idx_pub_likes_user on public.publication_likes(user_id);

-- 3. Publication saves (reading list / bookmark)
create table if not exists public.publication_saves (
  id uuid default gen_random_uuid() primary key,
  publication_id uuid references public.publications(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(publication_id, user_id)
);
create index if not exists idx_pub_saves_pub on public.publication_saves(publication_id);
create index if not exists idx_pub_saves_user on public.publication_saves(user_id);

-- 4. Comments
create table if not exists public.publication_comments (
  id uuid default gen_random_uuid() primary key,
  publication_id uuid references public.publications(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz default now()
);
create index if not exists idx_pub_comments_pub on public.publication_comments(publication_id);

-- RLS
alter table public.author_follows enable row level security;
alter table public.publication_likes enable row level security;
alter table public.publication_saves enable row level security;
alter table public.publication_comments enable row level security;

-- Follows: counts are public; users manage their own follow rows
drop policy if exists "follows readable" on public.author_follows;
create policy "follows readable" on public.author_follows for select using (true);
drop policy if exists "users follow" on public.author_follows;
create policy "users follow" on public.author_follows for insert with check (auth.uid() = follower_id);
drop policy if exists "users unfollow" on public.author_follows;
create policy "users unfollow" on public.author_follows for delete using (auth.uid() = follower_id);

-- Likes
drop policy if exists "likes readable" on public.publication_likes;
create policy "likes readable" on public.publication_likes for select using (true);
drop policy if exists "users like" on public.publication_likes;
create policy "users like" on public.publication_likes for insert with check (auth.uid() = user_id);
drop policy if exists "users unlike" on public.publication_likes;
create policy "users unlike" on public.publication_likes for delete using (auth.uid() = user_id);

-- Saves (private to the user)
drop policy if exists "users read own saves" on public.publication_saves;
create policy "users read own saves" on public.publication_saves for select using (auth.uid() = user_id);
drop policy if exists "users save" on public.publication_saves;
create policy "users save" on public.publication_saves for insert with check (auth.uid() = user_id);
drop policy if exists "users unsave" on public.publication_saves;
create policy "users unsave" on public.publication_saves for delete using (auth.uid() = user_id);

-- Comments: public read, owner write/delete
drop policy if exists "comments readable" on public.publication_comments;
create policy "comments readable" on public.publication_comments for select using (true);
drop policy if exists "users comment" on public.publication_comments;
create policy "users comment" on public.publication_comments for insert with check (auth.uid() = user_id);
drop policy if exists "users delete own comment" on public.publication_comments;
create policy "users delete own comment" on public.publication_comments for delete using (auth.uid() = user_id);

-- Counter triggers
create or replace function public.bump_follower_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.author_id;
  end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists trg_follower_count on public.author_follows;
create trigger trg_follower_count after insert or delete on public.author_follows
  for each row execute procedure public.bump_follower_count();

create or replace function public.bump_like_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.publications set like_count = like_count + 1 where id = new.publication_id;
  elsif tg_op = 'DELETE' then
    update public.publications set like_count = greatest(0, like_count - 1) where id = old.publication_id;
  end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists trg_like_count on public.publication_likes;
create trigger trg_like_count after insert or delete on public.publication_likes
  for each row execute procedure public.bump_like_count();

create or replace function public.bump_save_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.publications set save_count = save_count + 1 where id = new.publication_id;
  elsif tg_op = 'DELETE' then
    update public.publications set save_count = greatest(0, save_count - 1) where id = old.publication_id;
  end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists trg_save_count on public.publication_saves;
create trigger trg_save_count after insert or delete on public.publication_saves
  for each row execute procedure public.bump_save_count();

create or replace function public.bump_comment_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.publications set comment_count = comment_count + 1 where id = new.publication_id;
  elsif tg_op = 'DELETE' then
    update public.publications set comment_count = greatest(0, comment_count - 1) where id = old.publication_id;
  end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists trg_comment_count on public.publication_comments;
create trigger trg_comment_count after insert or delete on public.publication_comments
  for each row execute procedure public.bump_comment_count();
