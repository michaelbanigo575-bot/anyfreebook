-- Group admin controls. Run after 022_chat_groups.sql.
--
-- The group admin can appoint up to 5 helpers and choose what each may do:
--   approve   answer join requests
--   moderate  delete ordinary members' messages, give them a time-out, or remove them
--   announce  pin messages, schedule study sessions, and post when only staff may post
-- Helpers can never act against the admin or another helper. Banning, settings, the invite link,
-- appointing helpers, handing over and closing stay with the admin.
-- The admin can also set group rules, let only staff post, and slow the chat down.

-- ---------------------------------------------------------------- tables

alter table public.chat_groups add column if not exists rules text not null default '' check (char_length(rules) <= 1000);
alter table public.chat_groups add column if not exists admins_only boolean not null default false;
alter table public.chat_groups add column if not exists slow_seconds int not null default 0 check (slow_seconds in (0, 10, 30, 60, 300));

alter table public.chat_group_members add column if not exists permissions text[] not null default '{}'
  check (permissions <@ array['approve', 'moderate', 'announce']);

-- Kept apart from membership, so leaving and joining again does not end a time-out.
create table if not exists public.chat_group_timeouts (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  until timestamptz not null,
  set_by uuid references public.profiles(id) on delete set null,
  primary key (group_id, user_id)
);

create table if not exists public.chat_group_pins (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  message_id bigint not null references public.chat_group_messages(id) on delete cascade,
  pinned_by uuid references public.profiles(id) on delete set null,
  pinned_at timestamptz not null default now(),
  primary key (group_id, message_id)
);

create table if not exists public.chat_group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  note text not null default '' check (char_length(note) <= 300),
  starts_at timestamptz not null,
  minutes int not null check (minutes between 15 and 240),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_group_sessions on public.chat_group_sessions(group_id, starts_at);

-- All three are read and changed only through the functions below.
alter table public.chat_group_timeouts enable row level security;
alter table public.chat_group_pins enable row level security;
alter table public.chat_group_sessions enable row level security;
revoke all on public.chat_group_timeouts, public.chat_group_pins, public.chat_group_sessions from anon, authenticated;

-- Anyone who stops being a member, or joins again, starts with no powers.
create or replace function public.chat_group_drop_powers()
returns trigger language plpgsql as $$
begin
  if new.status <> 'member' or old.status <> 'member' then new.permissions := '{}'; end if;
  return new;
end $$;
drop trigger if exists chat_group_drop_powers on public.chat_group_members;
create trigger chat_group_drop_powers before update on public.chat_group_members
  for each row execute function public.chat_group_drop_powers();

-- ---------------------------------------------------------------- helpers (not callable by people)

-- May this person do this in this group? The admin always may. A suspended helper may not.
create or replace function public.chat_group_may(p_group uuid, p_user uuid, p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_group_members m join chat_groups g on g.id = m.group_id
    where m.group_id = p_group and m.user_id = p_user and m.status = 'member' and g.closed_at is null
      and (g.owner_id = p_user or (p_permission = any(m.permissions) and not chat_suspended(p_user)))
  );
$$;

create or replace function public.chat_group_is_staff(p_group uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_group_members m join chat_groups g on g.id = m.group_id
    where m.group_id = p_group and m.user_id = p_user and m.status = 'member'
      and (g.owner_id = p_user or cardinality(m.permissions) > 0)
  );
$$;

-- Locks the group and returns it, if the person asking holds the permission. Anyone else gets "not found".
create or replace function public.chat_group_as_staff(p_group uuid, p_permission text)
returns public.chat_groups language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); g chat_groups;
begin
  perform chat_group_lock(p_group);
  select * into g from chat_groups where id = p_group and closed_at is null for update;
  if not found or not chat_group_may(p_group, me, p_permission) then raise exception 'chat:not-found'; end if;
  return g;
end $$;

-- ---------------------------------------------------------------- the admin's settings

create or replace function public.chat_group_settings(p_group uuid, p_rules text, p_admins_only boolean, p_slow_seconds int)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group); v_rules text := btrim(coalesce(p_rules, ''), E' \t\r\n');
begin
  if chat_suspended(g.owner_id) then raise exception 'chat:suspended'; end if;
  if char_length(v_rules) > 1000 then raise exception 'chat:message-too-long'; end if;
  if p_slow_seconds is null or p_slow_seconds not in (0, 10, 30, 60, 300) then raise exception 'chat:unavailable'; end if;
  update chat_groups set rules = v_rules, admins_only = coalesce(p_admins_only, false), slow_seconds = p_slow_seconds
    where id = g.id;
end $$;

-- Gives a member helper powers; an empty list takes them away.
create or replace function public.chat_group_set_helper(p_group uuid, p_user uuid, p_permissions text[])
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_admin(p_group); v text[];
begin
  select coalesce(array_agg(distinct x), '{}') into v from unnest(coalesce(p_permissions, '{}')) x;
  if p_user = g.owner_id or not chat_group_is_member(g.id, p_user) or not (v <@ array['approve', 'moderate', 'announce']) then
    raise exception 'chat:unavailable';
  end if;
  if cardinality(v) > 0 then
    if chat_suspended(g.owner_id) or chat_suspended(p_user) then raise exception 'chat:unavailable'; end if;
    if (select count(*) from chat_group_members
        where group_id = g.id and user_id <> p_user and cardinality(permissions) > 0) >= 5 then
      raise exception 'chat:too-many-helpers';
    end if;
  end if;
  update chat_group_members set permissions = v, updated_at = now() where group_id = g.id and user_id = p_user;
end $$;

-- ---------------------------------------------------------------- moderation

-- Stops one member posting and reacting for a while. 0 minutes ends it.
create or replace function public.chat_group_timeout(p_group uuid, p_user uuid, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'moderate'); me uuid := auth.uid();
begin
  if p_minutes is null or p_minutes < 0 or p_minutes > 10080 then raise exception 'chat:unavailable'; end if;
  if p_user = me or p_user = g.owner_id or not chat_group_is_member(g.id, p_user)
     or (me <> g.owner_id and chat_group_is_staff(g.id, p_user)) then
    raise exception 'chat:not-found';
  end if;
  if p_minutes = 0 then
    delete from chat_group_timeouts where group_id = g.id and user_id = p_user;
  else
    insert into chat_group_timeouts (group_id, user_id, until, set_by)
      values (g.id, p_user, now() + make_interval(mins => p_minutes), me)
      on conflict (group_id, user_id) do update set until = excluded.until, set_by = excluded.set_by;
  end if;
end $$;

create or replace function public.chat_group_remove(p_group uuid, p_user uuid, p_ban boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'moderate'); me uuid := auth.uid();
begin
  if p_user = g.owner_id or p_user = me then raise exception 'chat:unavailable'; end if;
  -- helpers remove ordinary members only, and never ban
  if me <> g.owner_id and (p_ban is true or chat_group_is_staff(g.id, p_user)
       or not chat_group_is_member(g.id, p_user)) then
    raise exception 'chat:not-found';
  end if;
  if not exists (select 1 from chat_group_members where group_id = g.id and user_id = p_user and status in ('member', 'pending', 'rejected')) then
    raise exception 'chat:not-found';
  end if;
  if p_ban is true then
    update chat_group_members set status = 'banned', updated_at = now() where group_id = g.id and user_id = p_user;
  else
    delete from chat_group_members where group_id = g.id and user_id = p_user;
  end if;
end $$;

create or replace function public.chat_group_decide(p_group uuid, p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'approve'); me uuid := auth.uid();
begin
  if not exists (select 1 from chat_group_members where group_id = g.id and user_id = p_user and status = 'pending') then
    raise exception 'chat:not-found';
  end if;
  if p_approve is true then
    if chat_suspended(me) or chat_suspended(g.owner_id) then raise exception 'chat:suspended'; end if;
    if chat_suspended(p_user) or chat_blocked(g.owner_id, p_user) or chat_blocked(me, p_user) then
      raise exception 'chat:unavailable';
    end if;
    perform chat_group_admit(g.id, p_user);
  else
    update chat_group_members set status = 'rejected', updated_at = now() where group_id = g.id and user_id = p_user;
  end if;
end $$;

-- Join requests, and (for the admin only) the banned list.
create or replace function public.chat_group_requests(p_group uuid)
returns table (user_id uuid, name text, handle text, avatar text, status text, since timestamptz)
language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'approve'); me uuid := auth.uid();
begin
  return query
    select p.id, p.display_name::text, p.creator_handle::text, p.avatar_url::text, m.status, m.updated_at
    from chat_group_members m join profiles p on p.id = m.user_id
    where m.group_id = g.id
      and ((m.status = 'banned' and me = g.owner_id)
        or (m.status = 'pending' and not chat_suspended(m.user_id)
            and not chat_blocked(g.owner_id, m.user_id) and not chat_blocked(me, m.user_id)))
    order by m.updated_at;
end $$;

create or replace function public.chat_group_delete_message(p_group uuid, p_message bigint)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); g chat_groups; msg chat_group_messages;
begin
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  select * into g from chat_groups where id = p_group;
  select * into msg from chat_group_messages where id = p_message and group_id = p_group and deleted_at is null;
  if not found then raise exception 'chat:not-found'; end if;
  if not (msg.sender_id = me or g.owner_id = me
          or (chat_group_may(p_group, me, 'moderate') and not chat_group_is_staff(p_group, msg.sender_id))) then
    raise exception 'chat:not-found';
  end if;
  update chat_group_messages set deleted_at = now() where id = msg.id;
  delete from chat_group_pins where group_id = p_group and message_id = msg.id;
end $$;

-- ---------------------------------------------------------------- posting rules

create or replace function public.chat_group_send(p_group uuid, p_body text, p_reply_to bigint default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); v_body text := chat_clean(p_body, 2000); v_id bigint; g chat_groups;
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  select * into g from chat_groups where id = p_group;
  if exists (select 1 from chat_group_timeouts where group_id = p_group and user_id = me and until > clock_timestamp()) then
    raise exception 'chat:timed-out';
  end if;
  if g.admins_only and not chat_group_may(p_group, me, 'announce') then raise exception 'chat:admins-only'; end if;
  if g.slow_seconds > 0 and not chat_group_is_staff(p_group, me) and exists (
    select 1 from chat_group_messages where group_id = p_group and sender_id = me
      and created_at > clock_timestamp() - make_interval(secs => g.slow_seconds)) then
    raise exception 'chat:slow-mode';
  end if;
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
    if exists (select 1 from chat_group_timeouts where group_id = p_group and user_id = me and until > clock_timestamp()) then
      raise exception 'chat:timed-out';
    end if;
    insert into chat_group_reactions (message_id, user_id, emoji) values (msg.id, me, p_emoji)
      on conflict (message_id, user_id) do update set emoji = excluded.emoji
      where chat_group_reactions.emoji <> excluded.emoji;
  end if;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then update chat_group_messages set reaction_rev = reaction_rev + 1 where id = msg.id; end if;
end $$;

-- ---------------------------------------------------------------- pins and study sessions

create or replace function public.chat_group_pin(p_group uuid, p_message bigint, p_pin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'announce');
begin
  if p_pin is not true then
    delete from chat_group_pins where group_id = g.id and message_id = p_message;
    return;
  end if;
  if chat_suspended(auth.uid()) then raise exception 'chat:suspended'; end if;
  if not exists (select 1 from chat_group_messages x where x.id = p_message and x.group_id = g.id and x.deleted_at is null
                 and chat_group_can_read(g.id, x.id, x.sender_id)) then
    raise exception 'chat:not-found';
  end if;
  if exists (select 1 from chat_group_pins where group_id = g.id and message_id = p_message) then return; end if;
  if (select count(*) from chat_group_pins where group_id = g.id) >= 3 then raise exception 'chat:too-many-pins'; end if;
  insert into chat_group_pins (group_id, message_id, pinned_by) values (g.id, p_message, auth.uid());
end $$;

-- Pins follow the same reading rules as the messages themselves.
create or replace function public.chat_group_pinned(p_group uuid)
returns table (message_id bigint, body text, sender_name text)
language sql stable security definer set search_path = public as $$
  select x.id, x.body, coalesce(p.display_name::text, p.creator_handle::text, 'Reader')
  from chat_group_pins k join chat_group_messages x on x.id = k.message_id join profiles p on p.id = x.sender_id
  where k.group_id = p_group and x.deleted_at is null and chat_group_can_read(p_group, x.id, x.sender_id)
  order by k.pinned_at desc, x.id desc;
$$;

create or replace function public.chat_group_schedule(p_group uuid, p_title text, p_note text, p_starts_at timestamptz, p_minutes int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g chat_groups := chat_group_as_staff(p_group, 'announce');
  v_title text := btrim(coalesce(p_title, ''), E' \t\r\n');
  v_note text := btrim(coalesce(p_note, ''), E' \t\r\n');
  v_id uuid;
begin
  if chat_suspended(auth.uid()) then raise exception 'chat:suspended'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 80 or char_length(v_note) > 300 then raise exception 'chat:session-details'; end if;
  if p_starts_at is null or p_starts_at < now() or p_starts_at > now() + interval '180 days'
     or p_minutes is null or p_minutes < 15 or p_minutes > 240 then
    raise exception 'chat:session-time';
  end if;
  if (select count(*) from chat_group_sessions where group_id = g.id and starts_at + make_interval(mins => minutes) > now()) >= 10 then
    raise exception 'chat:too-many-sessions';
  end if;
  insert into chat_group_sessions (group_id, title, note, starts_at, minutes, created_by)
    values (g.id, v_title, v_note, p_starts_at, p_minutes, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.chat_group_cancel_session(p_group uuid, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'announce');
begin
  delete from chat_group_sessions where id = p_session and group_id = g.id;
  if not found then raise exception 'chat:not-found'; end if;
end $$;

-- Sessions that have not finished yet. Members only.
create or replace function public.chat_group_upcoming(p_group uuid)
returns table (session_id uuid, title text, note text, starts_at timestamptz, minutes int)
language sql stable security definer set search_path = public as $$
  select s.id, s.title, s.note, s.starts_at, s.minutes from chat_group_sessions s
  where s.group_id = p_group and chat_group_is_member(p_group, auth.uid())
    and s.starts_at + make_interval(mins => s.minutes) > now()
  order by s.starts_at limit 10;
$$;

-- ---------------------------------------------------------------- what the screens need to know

-- The group's settings and what I may do in it. Members only.
create or replace function public.chat_group_my_controls(p_group uuid)
returns table (rules text, admins_only boolean, slow_seconds int, permissions text[], timed_out_until timestamptz)
language sql stable security definer set search_path = public as $$
  select g.rules, g.admins_only, g.slow_seconds,
    case when g.owner_id = auth.uid() then array['approve', 'moderate', 'announce']
         when chat_suspended(auth.uid()) then '{}'::text[] else m.permissions end,
    (select t.until from chat_group_timeouts t where t.group_id = g.id and t.user_id = auth.uid() and t.until > now())
  from chat_groups g join chat_group_members m on m.group_id = g.id and m.user_id = auth.uid()
  where g.id = p_group and m.status = 'member' and g.closed_at is null;
$$;

-- Who the helpers are is visible to members. Time-outs are shown only to those who can lift them.
create or replace function public.chat_group_roles(p_group uuid)
returns table (user_id uuid, permissions text[], timed_out_until timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.permissions,
    case when chat_group_may(p_group, auth.uid(), 'moderate') then t.until end
  from chat_group_members m
  left join chat_group_timeouts t on t.group_id = m.group_id and t.user_id = m.user_id and t.until > now()
  where m.group_id = p_group and m.status = 'member' and chat_group_is_member(p_group, auth.uid());
$$;

-- Same list as before; helpers who answer join requests now see the waiting count too.
create or replace function public.chat_my_groups()
returns table (
  group_id uuid, name text, description text, visibility text, status text, is_admin boolean, muted boolean,
  history_for_new boolean, members bigint, waiting bigint, last_body text, last_sender_name text, last_message_at timestamptz, unread bigint
) language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, g.visibility, m.status, g.owner_id = auth.uid(), m.muted, g.history_for_new,
    chat_group_size(g.id),
    case when chat_group_may(g.id, auth.uid(), 'approve') then
      (select count(*) from chat_group_members w where w.group_id = g.id and w.status = 'pending'
         and not chat_suspended(w.user_id) and not chat_blocked(auth.uid(), w.user_id) and not chat_blocked(g.owner_id, w.user_id))
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

-- ---------------------------------------------------------------- function permissions

-- Replaced functions keep the permissions 022 gave them. New ones are closed, then opened one by one.
revoke all on function
  public.chat_group_drop_powers(), public.chat_group_may(uuid, uuid, text), public.chat_group_is_staff(uuid, uuid),
  public.chat_group_as_staff(uuid, text), public.chat_group_settings(uuid, text, boolean, int),
  public.chat_group_set_helper(uuid, uuid, text[]), public.chat_group_timeout(uuid, uuid, int),
  public.chat_group_pin(uuid, bigint, boolean), public.chat_group_pinned(uuid),
  public.chat_group_schedule(uuid, text, text, timestamptz, int), public.chat_group_cancel_session(uuid, uuid),
  public.chat_group_upcoming(uuid), public.chat_group_my_controls(uuid), public.chat_group_roles(uuid)
  from public, anon, authenticated;
grant execute on function
  public.chat_group_settings(uuid, text, boolean, int), public.chat_group_set_helper(uuid, uuid, text[]),
  public.chat_group_timeout(uuid, uuid, int), public.chat_group_pin(uuid, bigint, boolean), public.chat_group_pinned(uuid),
  public.chat_group_schedule(uuid, text, text, timestamptz, int), public.chat_group_cancel_session(uuid, uuid),
  public.chat_group_upcoming(uuid), public.chat_group_my_controls(uuid), public.chat_group_roles(uuid)
  to authenticated;
