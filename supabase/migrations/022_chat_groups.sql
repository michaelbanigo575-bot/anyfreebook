-- Group chat: tables and privacy rules. Run after 021_chat.sql.
--
-- Public groups: listed, and anyone with chat on joins straight away.
-- Private groups: not listed. The invite link only asks to join; the group admin approves.
-- In both, only members read messages. The maker chooses, once, whether people who join later also see
-- earlier messages (on unless turned off). It cannot be changed, so nobody's words reach a wider
-- audience than the group had when they wrote them.
--
-- As in 021, nobody writes to these tables directly: every change goes through a function that
-- checks who is asking. People who blocked each other do not see each other's messages.
-- Limits: 50 members, 10 open groups per admin, 3 new groups a day, 20 waiting join requests per person.

-- ---------------------------------------------------------------- tables

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 300),
  visibility text not null check (visibility in ('public', 'private')),
  -- only the group admin ever sees this
  invite_token text not null default replace(gen_random_uuid()::text, '-', ''),
  history_for_new boolean not null default true,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create unique index if not exists idx_chat_groups_token on public.chat_groups(invite_token);
create index if not exists idx_chat_groups_public on public.chat_groups(last_message_at desc)
  where visibility = 'public' and closed_at is null;

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('member', 'pending', 'rejected', 'banned')),
  -- messages up to this one are hidden from this person (0 when the group shares its history)
  joined_after_id bigint not null default 0,
  last_read_id bigint not null default 0,
  muted boolean not null default false,
  joined_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_chat_group_members_user on public.chat_group_members(user_id, status);

create table if not exists public.chat_group_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  reply_to bigint references public.chat_group_messages(id) on delete set null,
  -- a deleted message is hidden from the group but kept for reports
  deleted_at timestamptz,
  -- goes up when reactions change, so open screens hear about it through this table
  reaction_rev int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_group_msg on public.chat_group_messages(group_id, id desc);
create index if not exists idx_chat_group_msg_sender on public.chat_group_messages(sender_id, created_at);

-- One reaction per person per message.
create table if not exists public.chat_group_reactions (
  message_id bigint not null references public.chat_group_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- Group reports join the same admin queue as one-to-one reports.
alter table public.chat_reports add column if not exists group_id uuid references public.chat_groups(id) on delete set null;

alter table public.chat_moderation_log add column if not exists group_id uuid references public.chat_groups(id) on delete set null;
alter table public.chat_moderation_log drop constraint if exists chat_moderation_log_action_check;
alter table public.chat_moderation_log add constraint chat_moderation_log_action_check
  check (action in ('suspend', 'restore', 'close-group'));

-- ---------------------------------------------------------------- who may read what

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_group_messages enable row level security;
alter table public.chat_group_reactions enable row level security;
-- Groups and member lists are read only through the functions below.
revoke all on public.chat_groups, public.chat_group_members, public.chat_group_messages, public.chat_group_reactions from anon, authenticated;
grant select on public.chat_group_messages to authenticated;

-- Answers only about the person asking, so it is safe for them to call.
create or replace function public.chat_group_can_read(p_group uuid, p_message bigint, p_sender uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_group_members m join chat_groups g on g.id = m.group_id
    where m.group_id = p_group and m.user_id = auth.uid() and m.status = 'member'
      and g.closed_at is null and p_message > m.joined_after_id
  ) and not exists (
    select 1 from chat_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_sender) or (b.blocker_id = p_sender and b.blocked_id = auth.uid())
  );
$$;

drop policy if exists "members read group messages" on public.chat_group_messages;
create policy "members read group messages" on public.chat_group_messages for select to authenticated
  using (deleted_at is null and public.chat_group_can_read(group_id, id, sender_id));

-- ---------------------------------------------------------------- helpers (not callable by people)

-- One limit across one-to-one and group messages.
create or replace function public.chat_check_rate(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from chat_messages where sender_id = p_user and created_at > now() - interval '1 minute')
   + (select count(*) from chat_group_messages where sender_id = p_user and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'chat:slow-down';
  end if;
end $$;

-- Locks one group, so joining, approving, removing and sending happen one at a time.
create or replace function public.chat_group_lock(p_group uuid)
returns void language sql security definer set search_path = public as $$
  select pg_advisory_xact_lock(hashtext('chatgroup:' || p_group::text));
$$;

create or replace function public.chat_group_size(p_group uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from chat_group_members where group_id = p_group and status = 'member';
$$;

create or replace function public.chat_group_is_member(p_group uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_group_members m join chat_groups g on g.id = m.group_id
                 where m.group_id = p_group and m.user_id = p_user and m.status = 'member' and g.closed_at is null);
$$;

-- The open group, if the person asking is its admin. Anyone else gets "not found".
create or replace function public.chat_group_as_admin(p_group uuid)
returns public.chat_groups language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); g chat_groups;
begin
  perform chat_group_lock(p_group);
  select * into g from chat_groups where id = p_group and owner_id = me and closed_at is null for update;
  if not found then raise exception 'chat:not-found'; end if;
  return g;
end $$;

create or replace function public.chat_group_admit(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_max bigint; v_from bigint;
begin
  if chat_group_size(p_group) >= 50 then raise exception 'chat:group-full'; end if;
  if (select count(*) from chat_group_members where user_id = p_user and status = 'member') >= 100 then
    raise exception 'chat:too-many-groups';
  end if;
  select coalesce(max(id), 0) into v_max from chat_group_messages where group_id = p_group;
  select case when history_for_new then 0 else v_max end into v_from from chat_groups where id = p_group;
  insert into chat_group_members (group_id, user_id, status, joined_after_id, last_read_id, joined_at)
    values (p_group, p_user, 'member', v_from, v_max, clock_timestamp())
    on conflict (group_id, user_id) do update
      set status = 'member', joined_after_id = excluded.joined_after_id, last_read_id = excluded.last_read_id,
          muted = false, joined_at = excluded.joined_at, updated_at = now();
end $$;

-- A group always has an admin: if the admin leaves or deletes their account, the longest-standing
-- member takes over. A group with no members left is removed.
create or replace function public.chat_group_keep_admin()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_next uuid;
begin
  if not exists (select 1 from chat_groups where id = old.group_id) then return null; end if;
  if exists (select 1 from chat_groups g join chat_group_members m on m.group_id = g.id and m.user_id = g.owner_id
             where g.id = old.group_id and m.status = 'member') then
    return null;
  end if;
  select m.user_id into v_next from chat_group_members m
    where m.group_id = old.group_id and m.status = 'member'
    order by chat_suspended(m.user_id), m.joined_at, m.user_id limit 1;
  if v_next is null then
    delete from chat_groups where id = old.group_id;
  else
    update chat_groups set owner_id = v_next where id = old.group_id;
  end if;
  return null;
end $$;

drop trigger if exists chat_group_keep_admin on public.chat_group_members;
create trigger chat_group_keep_admin after delete on public.chat_group_members
  for each row execute function public.chat_group_keep_admin();

-- ---------------------------------------------------------------- creating, finding and joining

create or replace function public.chat_group_create(p_name text, p_description text, p_visibility text, p_history boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := chat_me();
  v_name text := btrim(coalesce(p_name, ''), E' \t\r\n');
  v_about text := btrim(coalesce(p_description, ''), E' \t\r\n');
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 60 then raise exception 'chat:group-name'; end if;
  if char_length(v_about) > 300 then raise exception 'chat:message-too-long'; end if;
  if p_visibility is null or p_visibility not in ('public', 'private') then raise exception 'chat:unavailable'; end if;
  -- a public group's name and description are seen by people who never agreed to hear from the maker
  if p_visibility = 'public' and (chat_has_link(v_name) or chat_has_link(v_about)) then
    raise exception 'chat:no-links-in-group';
  end if;
  if (select count(*) from chat_groups where owner_id = me and closed_at is null) >= 10
     or (select count(*) from chat_groups where created_by = me and created_at > now() - interval '1 day') >= 3 then
    raise exception 'chat:too-many-groups';
  end if;
  insert into chat_groups (name, description, visibility, history_for_new, owner_id, created_by)
    values (v_name, v_about, p_visibility, coalesce(p_history, true), me, me) returning id into v_id;
  perform chat_group_admit(v_id, me);
  return v_id;
end $$;

create or replace function public.chat_groups_public(p_search text default '')
returns table (group_id uuid, name text, description text, members bigint, is_member boolean, history_for_new boolean)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := chat_me(); v text := lower(btrim(coalesce(p_search, '')));
begin
  return query
    select g.id, g.name, g.description, chat_group_size(g.id), chat_group_is_member(g.id, me), g.history_for_new
    from chat_groups g
    where g.visibility = 'public' and g.closed_at is null
      and (v = '' or position(v in lower(g.name || ' ' || g.description)) > 0)
      and not chat_suspended(g.owner_id) and not chat_blocked(me, g.owner_id)
      and not exists (select 1 from chat_group_members m where m.group_id = g.id and m.user_id = me and m.status = 'banned')
    order by g.last_message_at desc
    limit 100;
end $$;

-- Public groups only: joins straight away.
create or replace function public.chat_group_join(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); g chat_groups; v_status text;
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  perform chat_group_lock(p_group);
  select * into g from chat_groups where id = p_group and visibility = 'public' and closed_at is null;
  if not found then raise exception 'chat:unavailable'; end if;
  select status into v_status from chat_group_members where group_id = g.id and user_id = me;
  if v_status = 'member' then return; end if;
  if v_status = 'banned' or chat_suspended(g.owner_id) or chat_blocked(me, g.owner_id) then
    raise exception 'chat:unavailable';
  end if;
  perform chat_group_admit(g.id, me);
end $$;

-- What an invite link shows before asking to join: never any messages or member names.
create or replace function public.chat_group_invite_preview(p_token text)
returns table (group_id uuid, name text, description text, members bigint, my_status text, history_for_new boolean)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  return query
    select g.id, g.name, g.description, chat_group_size(g.id),
           -- a refusal is not announced
           coalesce((select case m.status when 'rejected' then 'none' else m.status end
                     from chat_group_members m where m.group_id = g.id and m.user_id = me), 'none'),
           g.history_for_new
    from chat_groups g
    where g.invite_token = p_token and g.visibility = 'private' and g.closed_at is null
      and not chat_suspended(g.owner_id) and not chat_blocked(me, g.owner_id)
      and not exists (select 1 from chat_group_members m where m.group_id = g.id and m.user_id = me and m.status = 'banned');
end $$;

-- Private groups: the link only asks. Returns 'pending', or 'member' if already in.
create or replace function public.chat_group_request(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); g chat_groups; m chat_group_members;
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  select * into g from chat_groups where invite_token = p_token and visibility = 'private' and closed_at is null;
  if not found then raise exception 'chat:unavailable'; end if;
  perform chat_group_lock(g.id);
  -- the link may have been reset while waiting for the lock
  if not exists (select 1 from chat_groups where id = g.id and invite_token = p_token and closed_at is null) then
    raise exception 'chat:unavailable';
  end if;
  select * into m from chat_group_members where group_id = g.id and user_id = me;
  if found then
    if m.status in ('member', 'pending') then return m.status; end if;
    if m.status = 'banned' then raise exception 'chat:unavailable'; end if;
    -- refused: quietly wait a day before the admin is asked again
    if m.updated_at > now() - interval '1 day' then return 'pending'; end if;
  end if;
  if chat_suspended(g.owner_id) or chat_blocked(me, g.owner_id) then raise exception 'chat:unavailable'; end if;
  if (select count(*) from chat_group_members where user_id = me and status = 'pending') >= 20
     or (select count(*) from chat_group_members where group_id = g.id and status = 'pending') >= 100 then
    raise exception 'chat:too-many-requests';
  end if;
  insert into chat_group_members (group_id, user_id, status) values (g.id, me, 'pending')
    on conflict (group_id, user_id) do update set status = 'pending', updated_at = now();
  return 'pending';
end $$;

-- ---------------------------------------------------------------- the group admin

create or replace function public.chat_group_decide(p_group uuid, p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group);
begin
  if not exists (select 1 from chat_group_members where group_id = g.id and user_id = p_user and status = 'pending') then
    raise exception 'chat:not-found';
  end if;
  if p_approve is true then
    if chat_suspended(g.owner_id) then raise exception 'chat:suspended'; end if;
    if chat_suspended(p_user) or chat_blocked(g.owner_id, p_user) then raise exception 'chat:unavailable'; end if;
    perform chat_group_admit(g.id, p_user);
  else
    update chat_group_members set status = 'rejected', updated_at = now() where group_id = g.id and user_id = p_user;
  end if;
end $$;

-- Removes a member. With p_ban they cannot come back until unbanned.
create or replace function public.chat_group_remove(p_group uuid, p_user uuid, p_ban boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group);
begin
  if p_user = g.owner_id then raise exception 'chat:unavailable'; end if;
  if not exists (select 1 from chat_group_members where group_id = g.id and user_id = p_user and status in ('member', 'pending', 'rejected')) then
    raise exception 'chat:not-found';
  end if;
  if p_ban is true then
    update chat_group_members set status = 'banned', updated_at = now() where group_id = g.id and user_id = p_user;
  else
    delete from chat_group_members where group_id = g.id and user_id = p_user;
  end if;
end $$;

create or replace function public.chat_group_unban(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group);
begin
  delete from chat_group_members where group_id = g.id and user_id = p_user and status = 'banned';
  if not found then raise exception 'chat:not-found'; end if;
end $$;

create or replace function public.chat_group_transfer(p_group uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group);
begin
  if p_user = g.owner_id or not chat_group_is_member(g.id, p_user) or chat_suspended(p_user) then
    raise exception 'chat:unavailable';
  end if;
  if (select count(*) from chat_groups where owner_id = p_user and closed_at is null) >= 10 then
    raise exception 'chat:too-many-groups';
  end if;
  update chat_groups set owner_id = p_user where id = g.id;
end $$;

create or replace function public.chat_group_update(p_group uuid, p_name text, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare
  g chat_groups := chat_group_as_admin(p_group);
  v_name text := btrim(coalesce(p_name, ''), E' \t\r\n');
  v_about text := btrim(coalesce(p_description, ''), E' \t\r\n');
begin
  if chat_suspended(g.owner_id) then raise exception 'chat:suspended'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 60 then raise exception 'chat:group-name'; end if;
  if char_length(v_about) > 300 then raise exception 'chat:message-too-long'; end if;
  if g.visibility = 'public' and (chat_has_link(v_name) or chat_has_link(v_about)) then
    raise exception 'chat:no-links-in-group';
  end if;
  update chat_groups set name = v_name, description = v_about where id = g.id;
end $$;

create or replace function public.chat_group_invite_link(p_group uuid, p_reset boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group); v text;
begin
  if g.visibility <> 'private' then raise exception 'chat:unavailable'; end if;
  if chat_suspended(g.owner_id) then raise exception 'chat:suspended'; end if;
  if p_reset is true then
    update chat_groups set invite_token = replace(gen_random_uuid()::text, '-', '') where id = g.id returning invite_token into v;
    return v;
  end if;
  return g.invite_token;
end $$;

-- Closing is final in this version. Messages are kept for reports but nobody in the group can read them.
create or replace function public.chat_group_close(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group);
begin
  update chat_groups set closed_at = now() where id = g.id;
end $$;

create or replace function public.chat_group_requests(p_group uuid)
returns table (user_id uuid, name text, handle text, avatar text, status text, since timestamptz)
language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group);
begin
  return query
    select p.id, p.display_name::text, p.creator_handle::text, p.avatar_url::text, m.status, m.updated_at
    from chat_group_members m join profiles p on p.id = m.user_id
    where m.group_id = g.id
      and (m.status = 'banned' or (m.status = 'pending' and not chat_suspended(m.user_id) and not chat_blocked(g.owner_id, m.user_id)))
    order by m.updated_at;
end $$;

-- ---------------------------------------------------------------- members

create or replace function public.chat_group_member_list(p_group uuid)
returns table (user_id uuid, name text, handle text, avatar text, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  return query
    select p.id, p.display_name::text, p.creator_handle::text, p.avatar_url::text, p.id = g.owner_id
    from chat_group_members m join profiles p on p.id = m.user_id join chat_groups g on g.id = m.group_id
    where m.group_id = p_group and m.status = 'member'
      -- the admin needs the whole list to manage the group
      and (g.owner_id = me or p.id = g.owner_id or not chat_blocked(me, p.id))
    order by (p.id = g.owner_id) desc, m.joined_at;
end $$;

create or replace function public.chat_group_send(p_group uuid, p_body text, p_reply_to bigint default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); v_body text := chat_clean(p_body, 2000); v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  -- a reply may only point at a message in this group that the writer can see
  if p_reply_to is not null and not exists (
    select 1 from chat_group_messages r where r.id = p_reply_to and r.group_id = p_group and r.deleted_at is null
      and chat_group_can_read(p_group, r.id, r.sender_id)) then
    raise exception 'chat:not-found';
  end if;
  perform chat_check_rate(me);
  insert into chat_group_messages (group_id, sender_id, body, reply_to) values (p_group, me, v_body, p_reply_to) returning id into v_id;
  update chat_groups set last_message_at = now() where id = p_group;
  update chat_group_members set last_read_id = v_id where group_id = p_group and user_id = me;
  return v_id;
end $$;

-- Adds, changes or (with null) removes my reaction.
create or replace function public.chat_group_react(p_group uuid, p_message bigint, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); msg chat_group_messages; v_changed int;
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  perform chat_group_lock(p_group);
  select * into msg from chat_group_messages where id = p_message and group_id = p_group and deleted_at is null;
  if not found or not chat_group_can_read(p_group, msg.id, msg.sender_id) then raise exception 'chat:not-found'; end if;
  if p_emoji is null then
    delete from chat_group_reactions where message_id = msg.id and user_id = me;
  else
    if chat_suspended(me) then raise exception 'chat:suspended'; end if;
    insert into chat_group_reactions (message_id, user_id, emoji) values (msg.id, me, p_emoji)
      on conflict (message_id, user_id) do update set emoji = excluded.emoji
      where chat_group_reactions.emoji <> excluded.emoji;
  end if;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then update chat_group_messages set reaction_rev = reaction_rev + 1 where id = msg.id; end if;
end $$;

-- Reaction counts for messages the person can see. People they blocked are not counted.
create or replace function public.chat_group_reaction_counts(p_group uuid, p_messages bigint[])
returns table (message_id bigint, emoji text, total bigint, mine boolean)
language sql stable security definer set search_path = public as $$
  select r.message_id, r.emoji, count(*), bool_or(r.user_id = auth.uid())
  from chat_group_reactions r join chat_group_messages x on x.id = r.message_id
  where x.group_id = p_group and x.id = any(p_messages[1:200]) and x.deleted_at is null
    and chat_group_can_read(p_group, x.id, x.sender_id) and not chat_blocked(auth.uid(), r.user_id)
  group by r.message_id, r.emoji
  order by r.message_id, count(*) desc, r.emoji;
$$;

-- A person deletes their own message; the group admin can delete anyone's. It is kept for reports.
create or replace function public.chat_group_delete_message(p_group uuid, p_message bigint)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  update chat_group_messages x set deleted_at = now()
    where x.id = p_message and x.group_id = p_group and x.deleted_at is null
      and (x.sender_id = me or exists (select 1 from chat_groups g where g.id = p_group and g.owner_id = me));
  if not found then raise exception 'chat:not-found'; end if;
end $$;

create or replace function public.chat_group_mark_read(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  update chat_group_members set last_read_id = greatest(last_read_id,
      coalesce((select max(id) from chat_group_messages where group_id = p_group), 0))
    where group_id = p_group and user_id = me;
end $$;

create or replace function public.chat_group_mute(p_group uuid, p_muted boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  update chat_group_members set muted = coalesce(p_muted, false)
    where group_id = p_group and user_id = me and status = 'member';
  if not found then raise exception 'chat:not-found'; end if;
end $$;

-- Leaving (or cancelling a request) works even while suspended. A ban stays.
create or replace function public.chat_group_leave(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  perform chat_group_lock(p_group);
  -- a refusal also stays, or leaving would skip the day's wait
  delete from chat_group_members where group_id = p_group and user_id = auth.uid() and status in ('member', 'pending');
end $$;

create or replace function public.chat_group_report(p_group uuid, p_message bigint, p_reason text, p_details text default '')
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); msg chat_group_messages; v_after bigint;
begin
  if me is null then raise exception 'chat:sign-in-required'; end if;
  select * into msg from chat_group_messages where id = p_message and group_id = p_group;
  if not found or msg.sender_id = me or not chat_group_can_read(p_group, msg.id, msg.sender_id) then
    raise exception 'chat:not-found';
  end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if (select count(*) from chat_reports where reporter_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'chat:too-many-reports';
  end if;
  select joined_after_id into v_after from chat_group_members where group_id = p_group and user_id = me;
  insert into chat_reports (reporter_id, reported_id, group_id, reason, details, evidence)
  values (me, msg.sender_id, p_group, p_reason, left(coalesce(p_details, ''), 1000),
    -- the reported message and what led up to it, from what the reporter could see
    coalesce((select jsonb_agg(to_jsonb(x) order by x.id)
              from (select id, sender_id, body, created_at from chat_group_messages
                    where group_id = p_group and id <= msg.id and id > v_after and not chat_blocked(me, sender_id)
                    order by id desc limit 20) x), '[]'::jsonb));
end $$;

-- My groups and my waiting requests. A waiting request shows no messages.
create or replace function public.chat_my_groups()
returns table (
  group_id uuid, name text, description text, visibility text, status text, is_admin boolean, muted boolean,
  history_for_new boolean, members bigint, waiting bigint, last_body text, last_sender_name text, last_message_at timestamptz, unread bigint
) language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, g.visibility, m.status, g.owner_id = auth.uid(), m.muted, g.history_for_new,
    chat_group_size(g.id),
    case when g.owner_id = auth.uid() then
      (select count(*) from chat_group_members w where w.group_id = g.id and w.status = 'pending'
         and not chat_suspended(w.user_id) and not chat_blocked(auth.uid(), w.user_id))
    else 0 end,
    last.body, last.sender_name,
    case when m.status = 'member' then g.last_message_at else m.updated_at end,
    case when m.status = 'member' then
      (select count(*) from chat_group_messages u where u.group_id = g.id and u.deleted_at is null and u.sender_id <> auth.uid()
         and u.id > greatest(m.last_read_id, m.joined_after_id) and not chat_blocked(auth.uid(), u.sender_id))
    else 0 end
  from chat_group_members m
  join chat_groups g on g.id = m.group_id
  left join lateral (
    select x.body, p.display_name::text as sender_name from chat_group_messages x join profiles p on p.id = x.sender_id
    where m.status = 'member' and x.group_id = g.id and x.deleted_at is null and x.id > m.joined_after_id and not chat_blocked(auth.uid(), x.sender_id)
    order by x.id desc limit 1
  ) last on true
  where m.user_id = auth.uid() and m.status in ('member', 'pending') and g.closed_at is null
  order by 13 desc
  limit 200;
$$;

-- For the Messages badge: unread messages in groups that are not muted, and requests awaiting me as admin.
create or replace function public.chat_group_unread()
returns table (messages bigint, requests bigint) language sql stable security definer set search_path = public as $$
  select coalesce(sum(unread) filter (where not muted), 0)::bigint, coalesce(sum(waiting), 0)::bigint
  from chat_my_groups();
$$;

-- Server only: the site admin closes a group. The change and its log entry happen together.
create or replace function public.chat_admin_close_group(p_group uuid, p_reason text, p_admin text, p_report uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_reason text := btrim(coalesce(p_reason, ''), E' \t\r\n'); v_owner uuid;
begin
  if char_length(v_reason) < 3 or char_length(v_reason) > 1000 then raise exception 'chat:reason-required'; end if;
  if coalesce(btrim(p_admin), '') = '' then raise exception 'chat:admin-required'; end if;
  perform chat_group_lock(p_group);
  update chat_groups set closed_at = now() where id = p_group and closed_at is null returning owner_id into v_owner;
  if not found then raise exception 'chat:not-found'; end if;
  insert into chat_moderation_log (user_id, action, reason, admin, report_id, group_id)
    values (v_owner, 'close-group', v_reason, p_admin, p_report, p_group);
end $$;

-- ---------------------------------------------------------------- function permissions

-- Everything is closed first, then only what people may call is opened.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and (p.proname like 'chat\_group%' or p.proname in ('chat_my_groups', 'chat_admin_close_group', 'chat_check_rate'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function
  public.chat_group_can_read(uuid, bigint, uuid),
  public.chat_group_create(text, text, text, boolean),
  public.chat_group_react(uuid, bigint, text), public.chat_group_reaction_counts(uuid, bigint[]),
  public.chat_group_delete_message(uuid, bigint), public.chat_groups_public(text), public.chat_group_join(uuid),
  public.chat_group_invite_preview(text), public.chat_group_request(text),
  public.chat_group_decide(uuid, uuid, boolean), public.chat_group_remove(uuid, uuid, boolean),
  public.chat_group_unban(uuid, uuid), public.chat_group_transfer(uuid, uuid), public.chat_group_update(uuid, text, text),
  public.chat_group_invite_link(uuid, boolean), public.chat_group_close(uuid), public.chat_group_requests(uuid),
  public.chat_group_member_list(uuid), public.chat_group_send(uuid, text, bigint), public.chat_group_mark_read(uuid),
  public.chat_group_mute(uuid, boolean), public.chat_group_leave(uuid), public.chat_group_report(uuid, bigint, text, text),
  public.chat_my_groups(), public.chat_group_unread()
  to authenticated;
grant execute on function public.chat_admin_close_group(uuid, text, text, uuid) to service_role;

-- Live updates for group messages only. Its key is a plain number; member rows name people and stay out.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_group_messages') then
    alter publication supabase_realtime add table public.chat_group_messages;
  end if;
end $$;
