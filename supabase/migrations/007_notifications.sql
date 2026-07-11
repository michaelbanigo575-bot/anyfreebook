-- ANYFREEBOOK: in-app notifications (author goes live / publishes) — fan-out via DB triggers
-- Run in Supabase Dashboard → SQL Editor → New query → paste → Run

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,  -- recipient
  actor_id uuid references public.profiles(id) on delete cascade,           -- who caused it
  type text not null check (type in ('live_class', 'new_publication', 'new_post')),
  title text not null,
  link text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_notif_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notif_unread on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "own notifications readable" on public.notifications;
create policy "own notifications readable" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "own notifications updatable" on public.notifications;
create policy "own notifications updatable" on public.notifications for update using (auth.uid() = user_id);

-- Fan-out: author goes LIVE with a public class → notify all their readers
create or replace function public.notify_live_class() returns trigger
language plpgsql security definer set search_path = public as $$
declare author_name text;
begin
  if new.status = 'live' and old.status is distinct from 'live' and new.visibility = 'public' then
    select coalesce(display_name, 'An author you read') into author_name from profiles where id = new.host_id;
    insert into notifications (user_id, actor_id, type, title, link)
    select f.follower_id, new.host_id, 'live_class',
           author_name || ' is teaching live: ' || new.title,
           '/class/' || new.room_code
    from author_follows f where f.author_id = new.host_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_live_class on public.classrooms;
create trigger trg_notify_live_class after update on public.classrooms
  for each row execute function public.notify_live_class();

-- Fan-out: author publishes a new work → notify all their readers
create or replace function public.notify_new_publication() returns trigger
language plpgsql security definer set search_path = public as $$
declare author_name text;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select coalesce(display_name, 'An author you read') into author_name from profiles where id = new.author_id;
    insert into notifications (user_id, actor_id, type, title, link)
    select f.follower_id, new.author_id, 'new_publication',
           author_name || ' published: ' || new.title,
           '/read/' || new.slug
    from author_follows f where f.author_id = new.author_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_new_publication on public.publications;
create trigger trg_notify_new_publication after insert or update on public.publications
  for each row execute function public.notify_new_publication();

-- Fan-out: author posts to the feed → notify all their readers
create or replace function public.notify_new_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare author_name text;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select coalesce(display_name, 'An author you read') into author_name from profiles where id = new.author_id;
    insert into notifications (user_id, actor_id, type, title, link)
    select f.follower_id, new.author_id, 'new_post',
           author_name || ' posted: ' || new.title,
           '/feed'
    from author_follows f where f.author_id = new.author_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_new_post on public.feed_posts;
create trigger trg_notify_new_post after insert or update on public.feed_posts
  for each row execute function public.notify_new_post();

-- Realtime: push new notifications to connected clients
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end $$;
