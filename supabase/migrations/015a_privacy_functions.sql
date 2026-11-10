-- 015a_privacy_functions.sql — RUN THIS FIRST (additive, changes nothing visible).
-- Adds the server functions + invite table the new code needs. Safe to re-run.

create or replace function public.get_my_profile()
returns setof public.profiles
language sql security definer set search_path = public stable
as $$ select * from public.profiles where id = auth.uid(); $$;
revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.lookup_referrer(p_code text)
returns uuid
language sql security definer set search_path = public stable
as $$ select id from public.profiles where referral_code = p_code limit 1; $$;
revoke all on function public.lookup_referrer(text) from public;
grant execute on function public.lookup_referrer(text) to anon, authenticated;

create or replace function public.institution_members_with_profiles(p_institution uuid)
returns table (
  id uuid, institution_id uuid, profile_id uuid, role text, joined_at timestamptz,
  display_name text, email text, avatar_url text
)
language sql security definer set search_path = public stable
as $$
  select m.id, m.institution_id, m.profile_id, m.role::text, m.joined_at,
         p.display_name, p.email, p.avatar_url
  from public.institution_members m
  left join public.profiles p on p.id = m.profile_id
  where m.institution_id = p_institution
    and (
      exists (select 1 from public.institutions i where i.id = p_institution and i.owner_id = auth.uid())
      or exists (
        select 1 from public.institution_members me
        where me.institution_id = p_institution and me.profile_id = auth.uid()
          and me.role in ('owner', 'admin', 'teacher')
      )
    )
  order by m.joined_at asc;
$$;
revoke all on function public.institution_members_with_profiles(uuid) from public;
grant execute on function public.institution_members_with_profiles(uuid) to authenticated;

create table if not exists public.classroom_invites (
  classroom_id uuid primary key references public.classrooms(id) on delete cascade,
  token text not null
);
alter table public.classroom_invites enable row level security;
drop policy if exists "hosts read own invite" on public.classroom_invites;
create policy "hosts read own invite" on public.classroom_invites for select
  using (exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid()));
drop policy if exists "hosts create own invite" on public.classroom_invites;
create policy "hosts create own invite" on public.classroom_invites for insert
  with check (exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid()));

create or replace function public.classroom_access_ok(p_code text, p_token text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.classrooms c
    where c.room_code = p_code
      and (
        c.visibility = 'public'
        or c.host_id = auth.uid()
        or exists (select 1 from public.classroom_invites i
                   where i.classroom_id = c.id and i.token = p_token and p_token is not null)
      )
  );
$$;
revoke all on function public.classroom_access_ok(text, text) from public;
grant execute on function public.classroom_access_ok(text, text) to anon, authenticated;
