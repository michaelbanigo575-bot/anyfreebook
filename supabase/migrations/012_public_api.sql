-- 012_public_api.sql
--
-- Backing store for the public developer API (/api/v1/*).
--
-- PASTE THIS INTO THE SUPABASE DASHBOARD SQL EDITOR AND RUN IT MANUALLY.
-- There is no CLI link in this environment, so it has NOT been applied.
--
-- Safe to run more than once: every statement is idempotent.
--
-- Until this is applied the API still works — it falls back to the
-- per-instance in-memory limiter and treats every presented key as invalid.
-- See src/lib/api/sharedRateLimit.ts.

-- ---------------------------------------------------------------------------
-- 1. API keys
--
-- Only the SHA-256 hash of a key is stored, so a database dump does not hand
-- anyone a usable key. The key itself is shown once, when it is issued:
--
--   node scripts/issue-api-key.mjs --label "my app"
-- ---------------------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text not null default '',
  tier text not null default 'free' check (tier in ('free', 'partner')),
  requests_per_minute integer not null default 60 check (requests_per_minute > 0),
  requests_per_day integer check (requests_per_day is null or requests_per_day > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists api_keys_hash_idx on public.api_keys (key_hash);

-- The table is read and written only by the service role, which bypasses RLS.
-- No policy is created on purpose: with RLS enabled and no policy, anon and
-- authenticated see nothing even if a grant slips through.
alter table public.api_keys enable row level security;

revoke all on public.api_keys from anon, authenticated;
grant select, insert, update, delete on public.api_keys to service_role;

-- ---------------------------------------------------------------------------
-- 2. Shared rate-limit counters
--
-- The in-memory limiter in src/lib/rateLimit.ts lives on one serverless
-- instance and resets on cold start, so it cannot cap a public API. These
-- counters are shared by every instance, which is what makes the quota real.
-- ---------------------------------------------------------------------------
create table if not exists public.api_rate_limit (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0
);

alter table public.api_rate_limit enable row level security;
revoke all on public.api_rate_limit from anon, authenticated;
grant select, insert, update, delete on public.api_rate_limit to service_role;

-- ---------------------------------------------------------------------------
-- 3. The atomic counter
--
-- One round trip that both counts the hit and answers "are you still inside
-- the limit?". The INSERT ... ON CONFLICT takes a row lock on the bucket, so
-- two concurrent requests cannot both read the old count and both decide
-- they are under the limit.
--
-- SECURITY: a Postgres function is EXECUTE-able by PUBLIC by default, which
-- would let anyone holding the anon key reset the counters for everyone.
-- The revokes below are what close that.
-- ---------------------------------------------------------------------------
create or replace function public.api_rate_limit_hit(
  p_bucket text,
  p_limit integer,
  p_window_ms integer
)
returns table (allowed boolean, retry_after_sec integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window timestamptz := v_now - make_interval(secs => p_window_ms / 1000.0);
  v_hits integer := 0;
  v_started timestamptz := v_now;
begin
  -- Opportunistic cleanup: drop buckets whose window has fully expired.
  -- Runs on roughly 1% of calls so it is not a hot path.
  if random() < 0.01 then
    delete from public.api_rate_limit where window_started_at < v_window;
  end if;

  insert into public.api_rate_limit as r (bucket, window_started_at, hits)
  values (p_bucket, v_now, 1)
  on conflict (bucket) do update
    set hits = case
                 when r.window_started_at < v_window then 1
                 else r.hits + 1
               end,
        window_started_at = case
                 when r.window_started_at < v_window then v_now
                 else r.window_started_at
               end
  returning r.hits, r.window_started_at into v_hits, v_started;

  if v_hits <= p_limit then
    return query select true, 0;
  else
    return query select false, greatest(
      1,
      ceil(extract(epoch from (v_started + make_interval(secs => p_window_ms / 1000.0) - v_now)))
    )::integer;
  end if;
end;
$$;

-- Close the default PUBLIC execute grant, then allow only the service role.
revoke execute on function public.api_rate_limit_hit(text, integer, integer) from public;
revoke execute on function public.api_rate_limit_hit(text, integer, integer) from anon, authenticated;
grant execute on function public.api_rate_limit_hit(text, integer, integer) to service_role;
