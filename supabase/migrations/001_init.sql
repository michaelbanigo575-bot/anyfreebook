-- ANYFREEBOOK core schema
-- Run this in Supabase Dashboard → SQL Editor → New query → paste → Run

-- Users (extends Supabase auth.users with app-specific profile data)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique,
  display_name text,
  avatar_url text,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  is_premium boolean default false,
  premium_until timestamptz,
  favorite_category text,
  created_at timestamptz default now()
);

-- Book interactions (like, wishlist, favorite, read)
create table if not exists public.book_interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id text not null,
  book_title text,
  book_author text,
  book_slug text,
  action text not null check (action in ('liked', 'wishlisted', 'favorited', 'read')),
  created_at timestamptz default now(),
  unique(user_id, book_id, action)
);

-- Reading progress (for in-app PDF reader)
create table if not exists public.reading_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id text not null,
  book_title text,
  current_page int default 1,
  total_pages int,
  last_read_at timestamptz default now(),
  unique(user_id, book_id)
);

-- User collections (reading lists)
create table if not exists public.collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  slug text unique not null,
  description text,
  is_public boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.collection_books (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  book_id text not null,
  book_title text,
  book_author text,
  book_slug text,
  book_cover_url text,
  added_at timestamptz default now(),
  unique(collection_id, book_id)
);

-- Study plans / reading reminders
create table if not exists public.study_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  enabled boolean default false,
  goal_books_per_week int default 2,
  reminder_time text default '19:00',
  reminder_days int[] default '{1,3,5}',
  focus_category text,
  last_notified_date date,
  updated_at timestamptz default now()
);

-- Referrals (track who referred whom + conversion status)
create table if not exists public.referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_id uuid references public.profiles(id) on delete cascade,
  referred_email text,
  status text default 'pending' check (status in ('pending', 'signed_up', 'rewarded')),
  points_awarded int default 0,
  created_at timestamptz default now()
);

-- Reading challenges progress
create table if not exists public.challenge_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id text not null,
  progress int default 0,
  target int not null,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, challenge_id)
);

-- Lightweight analytics events
create table if not exists public.analytics_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_book_interactions_user on public.book_interactions(user_id);
create index if not exists idx_book_interactions_book on public.book_interactions(book_id);
create index if not exists idx_reading_progress_user on public.reading_progress(user_id);
create index if not exists idx_collections_user on public.collections(user_id);
create index if not exists idx_collections_slug on public.collections(slug);
create index if not exists idx_collection_books_collection on public.collection_books(collection_id);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
create index if not exists idx_analytics_events_type on public.analytics_events(event_type);
create index if not exists idx_analytics_events_created on public.analytics_events(created_at);

-- Row Level Security: users can only read/write their own data
alter table public.profiles enable row level security;
alter table public.book_interactions enable row level security;
alter table public.reading_progress enable row level security;
alter table public.collections enable row level security;
alter table public.collection_books enable row level security;
alter table public.study_plans enable row level security;
alter table public.referrals enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.analytics_events enable row level security;

-- Profiles: users can read any profile (for public referral pages), only edit their own
create policy "profiles are viewable by everyone" on public.profiles for select using (true);
create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Book interactions: only the owner
create policy "users manage own interactions" on public.book_interactions for all using (auth.uid() = user_id);

-- Reading progress: only the owner
create policy "users manage own reading progress" on public.reading_progress for all using (auth.uid() = user_id);

-- Collections: owner can do everything; public collections are viewable by anyone
create policy "public collections viewable by all" on public.collections for select using (is_public = true or auth.uid() = user_id);
create policy "users manage own collections" on public.collections for insert with check (auth.uid() = user_id);
create policy "users update own collections" on public.collections for update using (auth.uid() = user_id);
create policy "users delete own collections" on public.collections for delete using (auth.uid() = user_id);

-- Collection books: follow parent collection's visibility
create policy "collection books follow collection visibility" on public.collection_books for select
  using (exists (select 1 from public.collections c where c.id = collection_id and (c.is_public = true or c.user_id = auth.uid())));
create policy "owners manage collection books" on public.collection_books for insert
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));
create policy "owners delete collection books" on public.collection_books for delete
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));

-- Study plans: only the owner
create policy "users manage own study plan" on public.study_plans for all using (auth.uid() = user_id);

-- Referrals: referrer can see their own referrals
create policy "users view own referrals" on public.referrals for select using (auth.uid() = referrer_id);
create policy "system inserts referrals" on public.referrals for insert with check (true);

-- Challenge progress: only the owner
create policy "users manage own challenge progress" on public.challenge_progress for all using (auth.uid() = user_id);

-- Analytics: anyone can insert (even anonymous users), nobody can read except via service role
create policy "anyone can log events" on public.analytics_events for insert with check (true);

-- Auto-create a profile (with a generated referral code) whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    substr(replace(new.id::text, '-', ''), 1, 8)
  )
  on conflict (id) do nothing;

  insert into public.study_plans (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
