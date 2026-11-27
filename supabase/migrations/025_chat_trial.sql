-- Invite-only trial for chat, groups and the Study Room. Run after 024_study_room.sql.
--
-- While the trial is on, only invited email addresses can turn chat on or do anything with it. The
-- address must be confirmed, so nobody gets in by signing up with someone else's email. The check
-- sits in the database, so calling the API directly does not get around it. It starts ON, and if the
-- setting row is ever missing, chat stays closed.
-- Removing someone stops them acting. They can still read what they already could, report, block
-- and leave.

create table if not exists public.chat_trial (
  id boolean primary key default true check (id),
  invite_only boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now()
);
insert into public.chat_trial (id) values (true) on conflict (id) do nothing;

create table if not exists public.chat_invites (
  email text primary key check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  added_by text not null,
  created_at timestamptz not null default now()
);

-- Only the server (service role) reads or changes these.
alter table public.chat_trial enable row level security;
alter table public.chat_invites enable row level security;
revoke all on public.chat_trial, public.chat_invites from anon, authenticated;

-- Which wording a person agreed to when they turned chat on, and when.
alter table public.chat_settings add column if not exists rules_version text not null default '2026-11';
alter table public.chat_settings add column if not exists rules_accepted_at timestamptz not null default now();

create or replace function public.chat_allowed(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not coalesce((select invite_only from chat_trial where id), true)
      or exists (select 1 from auth.users u join chat_invites i on i.email = lower(u.email)
                 where u.id = p_user and u.email_confirmed_at is not null);
$$;
revoke all on function public.chat_allowed(uuid) from public, anon, authenticated;

create or replace function public.chat_me()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  if not chat_allowed(auth.uid()) then raise exception 'chat:invite-only'; end if;
  if not exists (select 1 from chat_settings where user_id = auth.uid()) then
    raise exception 'chat:turn-on-chat';
  end if;
  return auth.uid();
end $$;

create or replace function public.chat_enable(p_is_adult boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  if not chat_allowed(auth.uid()) then raise exception 'chat:invite-only'; end if;
  if p_is_adult is not true then raise exception 'chat:adults-only'; end if;
  insert into chat_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end $$;
