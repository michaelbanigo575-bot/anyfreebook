-- 015b_privacy_lockdown.sql — RUN THIS LAST, only AFTER 015a is applied AND the
-- new site code (commit "Privacy lockdown") has finished deploying on Cloudflare.
-- Safe to re-run.

-- 1. profiles: hide email, payout_email, referral_code, referred_by, is_premium,
--    premium_until from the public key and signed-in users (own row comes via get_my_profile()).
revoke select on public.profiles from anon, authenticated;
grant select (
  id, display_name, avatar_url, favorite_category, created_at,
  is_creator, creator_handle, creator_bio, creator_tier, creator_joined_at, follower_count
) on public.profiles to anon, authenticated;

-- 2. profiles: users may edit only harmless fields (before: they could set is_premium / creator_tier)
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name, avatar_url, favorite_category,
  is_creator, creator_handle, creator_bio, creator_joined_at, referred_by
) on public.profiles to authenticated;

-- 3. Private-class tokens: copy any not yet moved, then remove from the public table
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'classrooms' and column_name = 'invite_token') then
    insert into public.classroom_invites (classroom_id, token)
      select id, invite_token from public.classrooms where invite_token is not null
      on conflict (classroom_id) do nothing;
    alter table public.classrooms drop column invite_token;
  end if;
end $$;
