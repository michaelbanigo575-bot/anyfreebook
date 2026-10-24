-- 013_reddit.sql
--
-- Storage for the Reddit discovery + drafting queue.
--
-- PASTE THIS INTO THE SUPABASE DASHBOARD SQL EDITOR AND RUN IT MANUALLY.
-- There is no CLI link in this environment, so it has NOT been applied.
--
-- Safe to run more than once: every statement is idempotent.
--
-- What this database is NOT: a posting queue. There is no table here that a
-- bot could use to publish to Reddit, and no code in the app that writes to
-- Reddit. The system discovers threads and drafts replies; a person reads
-- the draft, checks the subreddit's rules, and submits it by hand.

-- ---------------------------------------------------------------------------
-- 1. The communities we watch
-- ---------------------------------------------------------------------------
create table if not exists public.reddit_targets (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('anyfreebook', 'afristudio')),
  subreddit text not null,
  purpose text not null default '',
  intent_keywords text[] not null default '{}',
  -- null means "nobody has verified this yet", which is NOT the same as false.
  links_allowed boolean,
  self_promo_thread text,
  min_account_age_days integer,
  min_karma integer,
  rules_verified_at timestamptz,
  active boolean not null default true,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product, subreddit)
);

alter table public.reddit_targets enable row level security;
revoke all on public.reddit_targets from anon, authenticated;
grant select, insert, update, delete on public.reddit_targets to service_role;

-- ---------------------------------------------------------------------------
-- 2. Threads we found
-- ---------------------------------------------------------------------------
create table if not exists public.reddit_posts (
  id uuid primary key default gen_random_uuid(),
  target_id uuid references public.reddit_targets(id) on delete set null,
  product text not null check (product in ('anyfreebook', 'afristudio')),
  subreddit text not null,
  reddit_id text not null unique,
  title text not null,
  body text not null default '',
  author text not null default '',
  url text not null,
  permalink text not null default '',
  created_utc timestamptz not null,
  score integer not null default 0,
  num_comments integer not null default 0,
  intent_score integer not null default 0,
  intent_signals text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'drafted', 'approved', 'skipped', 'published')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists reddit_posts_status_idx on public.reddit_posts (status, intent_score desc);
create index if not exists reddit_posts_seen_idx on public.reddit_posts (first_seen_at desc);

alter table public.reddit_posts enable row level security;
revoke all on public.reddit_posts from anon, authenticated;
grant select, insert, update, delete on public.reddit_posts to service_role;

-- ---------------------------------------------------------------------------
-- 3. Drafted replies, waiting for a human
-- ---------------------------------------------------------------------------
create table if not exists public.reddit_drafts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.reddit_posts(id) on delete set null,
  product text not null check (product in ('anyfreebook', 'afristudio')),
  subreddit text not null,
  body text not null,
  -- The answer and the mention are stored separately so the operator can see
  -- the split, and so the value ratio can be re-checked after an edit.
  answer_body text not null,
  mention_body text not null,
  disclosure text not null,
  value_ratio numeric not null default 0,
  linked_article_slug text,
  linked_article_url text,
  rule_checks text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'submitted', 'discarded')),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reddit_drafts_status_idx on public.reddit_drafts (status, created_at desc);

alter table public.reddit_drafts enable row level security;
revoke all on public.reddit_drafts from anon, authenticated;
grant select, insert, update, delete on public.reddit_drafts to service_role;

-- ---------------------------------------------------------------------------
-- 4. A log of what the system did
-- ---------------------------------------------------------------------------
create table if not exists public.reddit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reddit_events_created_idx on public.reddit_events (created_at desc);

alter table public.reddit_events enable row level security;
revoke all on public.reddit_events from anon, authenticated;
grant select, insert, update, delete on public.reddit_events to service_role;
