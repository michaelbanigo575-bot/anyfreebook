-- ANYFREEBOOK institution accounts: schools, universities, libraries, NGOs
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

create table if not exists public.institutions (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  type text default 'school' check (type in ('school','university','library','ngo','other')),
  description text,
  logo_url text,
  website text,
  country text,
  verified boolean default false,
  member_count int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_institutions_owner on public.institutions(owner_id);

create table if not exists public.institution_members (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references public.institutions(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'student' check (role in ('owner','admin','teacher','student')),
  joined_at timestamptz default now(),
  unique(institution_id, profile_id)
);
create index if not exists idx_inst_members_institution on public.institution_members(institution_id);
create index if not exists idx_inst_members_profile on public.institution_members(profile_id);

create table if not exists public.institution_invites (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references public.institutions(id) on delete cascade not null,
  token text unique not null,
  role text default 'student' check (role in ('admin','teacher','student')),
  created_by uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_inst_invites_institution on public.institution_invites(institution_id);

create table if not exists public.study_plan_templates (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid references public.institutions(id) on delete cascade not null,
  title text not null,
  goal_books_per_week int default 1,
  focus_category text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_study_templates_institution on public.study_plan_templates(institution_id);

-- Org attribution on existing content tables — the real human author/host
-- stays in author_id/host_id unchanged; this just carries branding.
alter table public.publications add column if not exists institution_id uuid references public.institutions(id) on delete set null;
alter table public.classrooms add column if not exists institution_id uuid references public.institutions(id) on delete set null;

-- RLS
alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;
alter table public.institution_invites enable row level security;
alter table public.study_plan_templates enable row level security;

-- Institutions: public read (directory + profile pages), owner-only write
drop policy if exists "institutions readable" on public.institutions;
create policy "institutions readable" on public.institutions for select using (true);
drop policy if exists "owner creates institution" on public.institutions;
create policy "owner creates institution" on public.institutions for insert with check (auth.uid() = owner_id);
drop policy if exists "owner updates institution" on public.institutions;
create policy "owner updates institution" on public.institutions for update using (auth.uid() = owner_id);
drop policy if exists "owner deletes institution" on public.institutions;
create policy "owner deletes institution" on public.institutions for delete using (auth.uid() = owner_id);

-- Members: public roster read; only an existing owner/admin (or the
-- institution's own owner_id, for bootstrapping the very first row) can
-- add/remove members; a member can remove themselves (leave).
drop policy if exists "members readable" on public.institution_members;
create policy "members readable" on public.institution_members for select using (true);
drop policy if exists "admins add members" on public.institution_members;
create policy "admins add members" on public.institution_members for insert with check (
  auth.uid() = profile_id
  or exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = institution_members.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin'))
);
drop policy if exists "admins update members" on public.institution_members;
create policy "admins update members" on public.institution_members for update using (
  exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = institution_members.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin'))
);
drop policy if exists "admins or self remove members" on public.institution_members;
create policy "admins or self remove members" on public.institution_members for delete using (
  auth.uid() = profile_id
  or exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = institution_members.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin'))
);

-- Invites: only owner/admin can create or read the token list; anyone
-- authenticated can look up a single invite by token to join (handled via
-- the token itself being the secret — select is open, same as a share link).
drop policy if exists "invites readable" on public.institution_invites;
create policy "invites readable" on public.institution_invites for select using (true);
drop policy if exists "admins create invites" on public.institution_invites;
create policy "admins create invites" on public.institution_invites for insert with check (
  exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = institution_invites.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin'))
);
drop policy if exists "admins delete invites" on public.institution_invites;
create policy "admins delete invites" on public.institution_invites for delete using (
  exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = institution_invites.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin'))
);

-- Study plan templates: readable by institution members, writable by owner/admin/teacher
drop policy if exists "templates readable" on public.study_plan_templates;
create policy "templates readable" on public.study_plan_templates for select using (true);
drop policy if exists "staff create templates" on public.study_plan_templates;
create policy "staff create templates" on public.study_plan_templates for insert with check (
  exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = study_plan_templates.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin','teacher'))
);
drop policy if exists "staff delete templates" on public.study_plan_templates;
create policy "staff delete templates" on public.study_plan_templates for delete using (
  exists (select 1 from public.institutions i where i.id = institution_id and i.owner_id = auth.uid())
  or exists (select 1 from public.institution_members m where m.institution_id = study_plan_templates.institution_id and m.profile_id = auth.uid() and m.role in ('owner','admin','teacher'))
);

-- Let an institution's owner/admin moderate comments on the institution's
-- own publications, in addition to the existing owner-only delete policy
-- from 003_social.sql.
drop policy if exists "institution admins delete comments on org content" on public.publication_comments;
create policy "institution admins delete comments on org content" on public.publication_comments for delete using (
  exists (
    select 1 from public.publications p
    join public.institution_members m on m.institution_id = p.institution_id
    where p.id = publication_comments.publication_id
      and m.profile_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

-- member_count trigger, mirroring bump_follower_count() in 003_social.sql
create or replace function public.bump_institution_member_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.institutions set member_count = member_count + 1 where id = new.institution_id;
  elsif tg_op = 'DELETE' then
    update public.institutions set member_count = greatest(0, member_count - 1) where id = old.institution_id;
  end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists trg_institution_member_count on public.institution_members;
create trigger trg_institution_member_count after insert or delete on public.institution_members
  for each row execute procedure public.bump_institution_member_count();

-- Auto-add the creator as 'owner' member when an institution is created,
-- so institution_members is always the single source of truth for roles
-- (the owner_id column on institutions is kept for RLS bootstrapping only).
create or replace function public.add_institution_owner_member() returns trigger as $$
begin
  insert into public.institution_members (institution_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (institution_id, profile_id) do nothing;
  return new;
end; $$ language plpgsql security definer;
drop trigger if exists trg_add_institution_owner on public.institutions;
create trigger trg_add_institution_owner after insert on public.institutions
  for each row execute procedure public.add_institution_owner_member();
