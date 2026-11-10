-- 016_private_class_people.sql — RUN BEFORE deploying the matching code.
-- Private classes: only the host and signed-in attendees can read the class
-- chat and attendee lists. Public classes behave exactly as before.
-- Safe to re-run.

create or replace function public.can_view_classroom_people(p_classroom uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom
      and (
        c.visibility = 'public'
        or c.host_id = auth.uid()
        or exists (select 1 from public.classroom_attendance a
                   where a.classroom_id = c.id and a.user_id = auth.uid())
      )
  );
$$;
revoke all on function public.can_view_classroom_people(uuid) from public;
grant execute on function public.can_view_classroom_people(uuid) to anon, authenticated;

-- Headcount only (no names) — works for everyone, including guests in private classes.
create or replace function public.classroom_attendance_count(p_classroom uuid)
returns integer
language sql security definer set search_path = public stable
as $$ select count(*)::int from public.classroom_attendance where classroom_id = p_classroom; $$;
revoke all on function public.classroom_attendance_count(uuid) from public;
grant execute on function public.classroom_attendance_count(uuid) to anon, authenticated;

drop policy if exists "messages readable" on public.classroom_messages;
create policy "messages readable" on public.classroom_messages for select
  using (public.can_view_classroom_people(classroom_id));

drop policy if exists "attendance readable" on public.classroom_attendance;
create policy "attendance readable" on public.classroom_attendance for select
  using (public.can_view_classroom_people(classroom_id));

drop policy if exists "session attendance readable" on public.classroom_session_attendance;
create policy "session attendance readable" on public.classroom_session_attendance for select
  using (public.can_view_classroom_people(classroom_id));
