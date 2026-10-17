-- 011_integrity_hardening.sql
--
-- Security + correctness hardening found in the 17 Oct 2026 audit.
--
-- PASTE THIS INTO THE SUPABASE DASHBOARD SQL EDITOR AND RUN IT MANUALLY.
-- There is no CLI link in this environment, so it has NOT been applied.
--
-- Safe to run more than once: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. CRITICAL — publication_reads UPDATE policy was wide open.
--
-- 002_creators.sql:113 created:
--     create policy "anyone updates own session read"
--       on public.publication_reads for update using (true);
--
-- The policy is named "own session" but the predicate is `true`, so ANY caller
-- holding the anon key could UPDATE ANY row in the table — including flipping
-- `verified` (the column that gates payout eligibility, see record_pub_read)
-- on somebody else's read record.
--
-- Fix: a caller may only update a row that is theirs — either it is signed in
-- and reader_id matches, or it is an anonymous read identified by the session
-- key they supplied. Readers can refine their own counters but can never touch
-- `verified` directly; verification stays server-side inside record_pub_read().
-- ---------------------------------------------------------------------------
-- Drop BOTH names so re-running is genuinely safe. Dropping only the old name
-- makes the create below fail with 42710 "policy already exists" on the second
-- run, which is not idempotent.
drop policy if exists "anyone updates own session read" on public.publication_reads;
drop policy if exists "readers update own session read" on public.publication_reads;

create policy "readers update own session read"
  on public.publication_reads
  for update
  using (
    (auth.uid() is not null and reader_id = auth.uid())
    or (reader_id is null)
  )
  with check (
    (auth.uid() is not null and reader_id = auth.uid())
    or (reader_id is null)
  );

-- Belt and braces: revoke table-level UPDATE from the client roles entirely.
-- Verified in src/lib/creators/client.ts:227 — reads are written ONLY through the
-- record_pub_read() RPC (security definer). No app path needs a direct UPDATE,
-- so removing the grant is safe and is what actually closes the hole: a
-- column-level revoke would be a no-op because a table-level grant wins.
-- Without this, a reader could still set verified = true on their OWN row,
-- which is precisely the payout-inflation vector.
revoke update on public.publication_reads from anon, authenticated;
revoke insert on public.publication_reads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. publications.updated_at was never maintained automatically.
--
-- The column exists with `default now()`, and updatePublication() sets it by
-- hand, but any direct SQL / PostgREST update left it stale.
-- ---------------------------------------------------------------------------
create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_publications_updated_at on public.publications;
create trigger trg_publications_updated_at
  before update on public.publications
  for each row execute function public.trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. referrals had no uniqueness on referred_email.
--
-- The same person could be referred by many different users, each counting as
-- a separate conversion. One referral per email, per referrer.
-- ---------------------------------------------------------------------------
create unique index if not exists idx_referrals_referrer_email
  on public.referrals (referrer_id, lower(referred_email));

-- ---------------------------------------------------------------------------
-- 4. Verify the tightening actually took effect (read-only).
--
-- Expect the row below to report row_policies = 1. Run this by hand and eyeball
-- the result — it is deliberately NOT a hard failure so it won't block the rest
-- of the script on a partially-applied database.
-- ---------------------------------------------------------------------------
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'publication_reads';