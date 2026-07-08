-- ANYFREEBOOK Creator Program schema
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- 1. Extend profiles with creator fields
alter table public.profiles add column if not exists is_creator boolean default false;
alter table public.profiles add column if not exists creator_handle text unique;
alter table public.profiles add column if not exists creator_bio text;
alter table public.profiles add column if not exists creator_tier text default 'bronze';
alter table public.profiles add column if not exists payout_email text;
alter table public.profiles add column if not exists creator_joined_at timestamptz;

-- 2. Publications (works authors post themselves)
create table if not exists public.publications (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  slug text unique not null,
  subtitle text,
  description text,
  cover_url text,
  category text default 'General',
  content_type text default 'article' check (content_type in ('article', 'book', 'poetry', 'guide', 'story')),
  body text,                    -- markdown / plain text content
  external_url text,            -- optional link to a hosted PDF/EPUB
  status text default 'draft' check (status in ('draft', 'published', 'removed')),
  view_count int default 0,
  read_count int default 0,     -- verified reads
  total_read_seconds bigint default 0,
  like_count int default 0,
  created_at timestamptz default now(),
  published_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists idx_publications_author on public.publications(author_id);
create index if not exists idx_publications_status on public.publications(status);
create index if not exists idx_publications_slug on public.publications(slug);
create index if not exists idx_publications_published on public.publications(published_at desc);

-- 3. Verified reads (drives payouts). One qualifying read per reader/publication/day.
create table if not exists public.publication_reads (
  id uuid default gen_random_uuid() primary key,
  publication_id uuid references public.publications(id) on delete cascade not null,
  reader_id uuid references public.profiles(id) on delete set null,
  session_key text not null,          -- anon fingerprint when not logged in
  read_seconds int default 0,
  scroll_pct int default 0,
  verified boolean default false,     -- met time+scroll thresholds
  day date default current_date,
  created_at timestamptz default now(),
  unique(publication_id, session_key, day)
);

create index if not exists idx_pub_reads_pub on public.publication_reads(publication_id);
create index if not exists idx_pub_reads_day on public.publication_reads(day);

-- 4. Monthly earnings ledger (populated by payout job once revenue exists)
create table if not exists public.creator_earnings (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  period text not null,               -- 'YYYY-MM'
  verified_reads int default 0,
  read_seconds bigint default 0,
  pool_share_pct numeric default 0,   -- this author's % of the creator pool
  amount_usd numeric default 0,
  qualified boolean default false,    -- met the monthly threshold
  status text default 'pending' check (status in ('pending', 'approved', 'paid')),
  created_at timestamptz default now(),
  unique(author_id, period)
);

create index if not exists idx_earnings_author on public.creator_earnings(author_id);
create index if not exists idx_earnings_period on public.creator_earnings(period);

-- 5. Program config (single row). Platform-favorable defaults.
create table if not exists public.creator_program_config (
  id int primary key default 1,
  pool_percentage numeric default 40,        -- % of creator-content ad revenue that funds the pool
  platform_percentage numeric default 60,    -- platform keeps this
  monthly_read_threshold int default 500,    -- verified reads/month to qualify (moderate)
  min_payout_usd numeric default 25,         -- accrue before cashout
  estimated_rpm_usd numeric default 1.20,    -- est. creator-pool $ per 1000 verified reads (display only)
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into public.creator_program_config (id) values (1) on conflict (id) do nothing;

-- RLS
alter table public.publications enable row level security;
alter table public.publication_reads enable row level security;
alter table public.creator_earnings enable row level security;
alter table public.creator_program_config enable row level security;

-- Publications: anyone can read published ones; authors manage their own
drop policy if exists "published pubs are public" on public.publications;
create policy "published pubs are public" on public.publications for select
  using (status = 'published' or auth.uid() = author_id);
drop policy if exists "authors insert own pubs" on public.publications;
create policy "authors insert own pubs" on public.publications for insert
  with check (auth.uid() = author_id);
drop policy if exists "authors update own pubs" on public.publications;
create policy "authors update own pubs" on public.publications for update
  using (auth.uid() = author_id);
drop policy if exists "authors delete own pubs" on public.publications;
create policy "authors delete own pubs" on public.publications for delete
  using (auth.uid() = author_id);

-- Reads: anyone (incl. anon) can log a read; nobody reads the raw table via anon
drop policy if exists "anyone logs reads" on public.publication_reads;
create policy "anyone logs reads" on public.publication_reads for insert with check (true);
drop policy if exists "anyone updates own session read" on public.publication_reads;
create policy "anyone updates own session read" on public.publication_reads for update using (true);

-- Earnings: authors see their own
drop policy if exists "authors view own earnings" on public.creator_earnings;
create policy "authors view own earnings" on public.creator_earnings for select
  using (auth.uid() = author_id);

-- Config: world-readable (the program terms are public)
drop policy if exists "config is public" on public.creator_program_config;
create policy "config is public" on public.creator_program_config for select using (true);

-- Atomic counter bump for views (used by the reader page)
create or replace function public.increment_pub_view(pub_slug text)
returns void as $$
  update public.publications set view_count = view_count + 1 where slug = pub_slug and status = 'published';
$$ language sql security definer;

-- Record a verified read + roll up publication counters atomically
create or replace function public.record_pub_read(
  p_slug text,
  p_session text,
  p_seconds int,
  p_scroll int,
  p_reader uuid default null
) returns void as $$
declare
  v_pub_id uuid;
  v_is_verified boolean;
  v_existing boolean;
begin
  select id into v_pub_id from public.publications where slug = p_slug and status = 'published';
  if v_pub_id is null then return; end if;

  v_is_verified := (p_seconds >= 30 and p_scroll >= 50);

  select true into v_existing from public.publication_reads
    where publication_id = v_pub_id and session_key = p_session and day = current_date;

  insert into public.publication_reads (publication_id, reader_id, session_key, read_seconds, scroll_pct, verified)
  values (v_pub_id, p_reader, p_session, p_seconds, p_scroll, v_is_verified)
  on conflict (publication_id, session_key, day)
  do update set
    read_seconds = greatest(public.publication_reads.read_seconds, excluded.read_seconds),
    scroll_pct = greatest(public.publication_reads.scroll_pct, excluded.scroll_pct),
    verified = public.publication_reads.verified or excluded.verified;

  -- Only roll counters on the first verified read of the day for this session
  if v_is_verified and v_existing is null then
    update public.publications
      set read_count = read_count + 1,
          total_read_seconds = total_read_seconds + p_seconds
      where id = v_pub_id;
  end if;
end;
$$ language plpgsql security definer;
