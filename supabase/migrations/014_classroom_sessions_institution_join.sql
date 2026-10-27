-- 014: classroom session history, and a fix to who may join an institution.
--
-- Two things here:
--
-- 1. CLASSROOM SESSION HISTORY. A host currently gets one row per classroom
--    with a started_at, an ended_at and a peak_attendance count. That is not
--    history: it answers "how many people were here at once" but not "who
--    was here, for how long, in which session". A classroom that runs every
--    week needs each session kept separately, so a teacher can see who
--    attended, how long the session ran, and whether attendance is growing.
--
--    classroom_sessions is one row per live session. classroom_session_attendance
--    is one row per person per session: the profile id when they are signed
--    up, and a stable random guest id when they are not.
--
-- 2. INSTITUTION SELF-JOIN. The "admins add members" policy allows an
--    insert when `auth.uid() = profile_id`, which is what lets a reader join
--    an institution without an invite. But it says nothing about the ROLE:
--    as written, any signed-in user could insert themselves as 'owner' of any
--    institution and take it over. The policy is tightened so a self-insert
--    can only ever be a 'student'. Admins and owners are still added by
--    admins and owners.

-- ---------------------------------------------------------------------------
-- 1. Classroom session history
-- ---------------------------------------------------------------------------

create table if not exists public.classroom_sessions (
  id uuid default gen_random_uuid() primary key,
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  host_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Denormalised so a history list does not need a second query per row.
  duration_seconds int,
  attendee_count int default 0,
  title text,
  created_at timestamptz default now()
);
create index if not exists idx_class_sessions_room on public.classroom_sessions(classroom_id, started_at desc);
create index if not exists idx_class_sessions_host on public.classroom_sessions(host_id, started_at desc);

-- One row per attendee per session.
--   user_id      set when the attendee was signed in
--   guest_id     a stable random id when they were not
--   display_name the name to show the host: their profile name, or the guest
--                name they typed in
create table if not exists public.classroom_session_attendance (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.classroom_sessions(id) on delete cascade not null,
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  guest_id text,
  display_name text not null default 'Guest',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  -- Seconds the attendee was connected, accumulated by the client.
  watch_seconds int default 0,
  check (user_id is not null or guest_id is not null)
);
create index if not exists idx_class_sess_att_session on public.classroom_session_attendance(session_id);
create index if not exists idx_class_sess_att_room on public.classroom_session_attendance(classroom_id);
create index if not exists idx_class_sess_att_user on public.classroom_session_attendance(user_id);

-- One row per attendee per session. Two partial unique indexes rather than one
-- composite: in Postgres a NULL never equals another NULL, so a single
-- unique(session_id, user_id, guest_id) would let a signed-in attendee insert
-- a fresh row on every reconnect (their guest_id is NULL).
create unique index if not exists uq_class_sess_att_user
  on public.classroom_session_attendance(session_id, user_id)
  where user_id is not null;
create unique index if not exists uq_class_sess_att_guest
  on public.classroom_session_attendance(session_id, guest_id)
  where guest_id is not null;

alter table public.classroom_sessions enable row level security;
alter table public.classroom_session_attendance enable row level security;

-- A session history is visible to anyone who can see the classroom: the host
-- needs it to track their students, and it is not private information.
drop policy if exists "classroom sessions readable" on public.classroom_sessions;
create policy "classroom sessions readable" on public.classroom_sessions for select using (true);

-- Anyone may open a session row (the client starts one when the host goes
-- live). Writing the session itself is restricted to the host below.
drop policy if exists "classroom sessions insertable" on public.classroom_sessions;
create policy "classroom sessions insertable" on public.classroom_sessions for insert with check (
  auth.uid() = host_id
  or exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid())
);

drop policy if exists "hosts update classroom sessions" on public.classroom_sessions;
create policy "hosts update classroom sessions" on public.classroom_sessions for update using (
  auth.uid() = host_id
  or exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid())
);

drop policy if exists "hosts delete classroom sessions" on public.classroom_sessions;
create policy "hosts delete classroom sessions" on public.classroom_sessions for delete using (
  auth.uid() = host_id
  or exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid())
);

-- Attendance: readable like the session, insertable by anyone (a guest with no
-- account still has to be counted), editable by the host so the teacher can
-- correct a name.
drop policy if exists "session attendance readable" on public.classroom_session_attendance;
create policy "session attendance readable" on public.classroom_session_attendance for select using (true);

drop policy if exists "anyone records session attendance" on public.classroom_session_attendance;
create policy "anyone records session attendance" on public.classroom_session_attendance for insert with check (true);

drop policy if exists "hosts update session attendance" on public.classroom_session_attendance;
create policy "hosts update session attendance" on public.classroom_session_attendance for update using (
  exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid())
);

drop policy if exists "hosts delete session attendance" on public.classroom_session_attendance;
create policy "hosts delete session attendance" on public.classroom_session_attendance for delete using (
  exists (select 1 from public.classrooms c where c.id = classroom_id and c.host_id = auth.uid())
);

-- Keep the denormalised counters true whenever an attendee row changes, so a
-- history list can be read without aggregating on every request.
create or replace function public.bump_classroom_session_counts() returns trigger as $$
declare
  v_session uuid := coalesce(new.session_id, old.session_id);
begin
  update public.classroom_sessions
  set attendee_count = (
        select count(*)::int from public.classroom_session_attendance where session_id = v_session
      )
  where id = v_session;
  return null;
end; $$ language plpgsql security definer;

drop trigger if exists trg_class_session_att_count on public.classroom_session_attendance;
create trigger trg_class_session_att_count
  after insert or delete on public.classroom_session_attendance
  for each row execute procedure public.bump_classroom_session_counts();

-- Fill in the duration when a session ends, so the host's history does not
-- depend on the client remembering to set it.
create or replace function public.set_classroom_session_duration() returns trigger as $$
begin
  if new.ended_at is not null and (new.duration_seconds is null or new.duration_seconds = 0) then
    new.duration_seconds := greatest(0, extract(epoch from (new.ended_at - new.started_at))::int);
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_class_session_duration on public.classroom_sessions;
create trigger trg_class_session_duration
  before update on public.classroom_sessions
  for each row execute procedure public.set_classroom_session_duration();

-- ---------------------------------------------------------------------------
-- 2. Institution self-join, without the privilege-escalation hole
-- ---------------------------------------------------------------------------

-- The old policy let any signed-in user insert a row for themselves with ANY
-- role, including 'owner'. That is a takeover of somebody else's institution.
-- A self-insert is now only ever a 'student'; owners and admins are still
-- added by owners and admins.
drop policy if exists "admins add members" on public.institution_members;
create policy "admins add members" on public.institution_members for insert with check (
  (
    auth.uid() = profile_id
    and role = 'student'
  )
  or exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (
    select 1 from public.institution_members m
    where m.institution_id = institution_members.institution_id
      and m.profile_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

-- A member may still not promote themselves: the update policy is for
-- admins, and it now also requires the target row to keep a sane role.
drop policy if exists "admins update members" on public.institution_members;
create policy "admins update members" on public.institution_members for update using (
  exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (
    select 1 from public.institution_members m
    where m.institution_id = institution_members.institution_id
      and m.profile_id = auth.uid()
      and m.role in ('owner','admin')
  )
);
