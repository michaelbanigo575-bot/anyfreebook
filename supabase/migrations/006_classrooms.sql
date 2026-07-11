-- ANYFREEBOOK: live classrooms (Jitsi-embedded video + Supabase Realtime chat)
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

-- 1. Classrooms
create table if not exists public.classrooms (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  room_code text unique not null,          -- short public identifier, also the Jitsi room suffix
  invite_token text,                        -- required to join when visibility = 'private'
  publication_id uuid references public.publications(id) on delete set null,
  visibility text default 'public' check (visibility in ('public', 'private')),
  status text default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  scheduled_at timestamptz not null,
  duration_min int default 60,
  started_at timestamptz,
  ended_at timestamptz,
  recording_url text,                       -- host-uploaded replay video
  peak_attendance int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_classrooms_host on public.classrooms(host_id);
create index if not exists idx_classrooms_code on public.classrooms(room_code);
create index if not exists idx_classrooms_sched on public.classrooms(scheduled_at desc);
create index if not exists idx_classrooms_status on public.classrooms(status);

alter table public.classrooms enable row level security;
drop policy if exists "classrooms readable" on public.classrooms;
create policy "classrooms readable" on public.classrooms for select using (true);
drop policy if exists "hosts insert classrooms" on public.classrooms;
create policy "hosts insert classrooms" on public.classrooms for insert with check (auth.uid() = host_id);
drop policy if exists "hosts update classrooms" on public.classrooms;
create policy "hosts update classrooms" on public.classrooms for update using (auth.uid() = host_id);
drop policy if exists "hosts delete classrooms" on public.classrooms;
create policy "hosts delete classrooms" on public.classrooms for delete using (auth.uid() = host_id);

-- 2. Attendance (one row per participant per classroom; anonymous via session key)
create table if not exists public.classroom_attendance (
  id uuid default gen_random_uuid() primary key,
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  session_key text not null,
  display_name text,
  joined_at timestamptz default now(),
  unique(classroom_id, session_key)
);
create index if not exists idx_class_att_room on public.classroom_attendance(classroom_id);

alter table public.classroom_attendance enable row level security;
drop policy if exists "attendance readable" on public.classroom_attendance;
create policy "attendance readable" on public.classroom_attendance for select using (true);
drop policy if exists "anyone joins" on public.classroom_attendance;
create policy "anyone joins" on public.classroom_attendance for insert with check (true);

-- 3. Live chat messages (persist for the replay)
create table if not exists public.classroom_messages (
  id uuid default gen_random_uuid() primary key,
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null default 'Guest',
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now()
);
create index if not exists idx_class_msg_room on public.classroom_messages(classroom_id, created_at);

alter table public.classroom_messages enable row level security;
drop policy if exists "messages readable" on public.classroom_messages;
create policy "messages readable" on public.classroom_messages for select using (true);
drop policy if exists "signed-in users chat" on public.classroom_messages;
create policy "signed-in users chat" on public.classroom_messages for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- 4. Realtime: broadcast new chat messages + classroom status changes to connected clients
do $$
begin
  begin
    alter publication supabase_realtime add table public.classroom_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.classrooms;
  exception when duplicate_object then null;
  end;
end $$;
