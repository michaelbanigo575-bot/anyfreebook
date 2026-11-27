-- User-to-user chat, stage 1: tables and privacy rules.
--
-- The rules live in the database, so they hold even if a page has a bug or someone calls the API
-- directly. People can only READ their own chat rows. Nobody can write to these tables directly:
-- every change goes through a function below, which checks who is asking.
--
-- People who follow each other chat straight away. Anyone else sends one short message request.

-- ---------------------------------------------------------------- tables

-- Chat is off until a person turns it on and confirms they are 18 or older.
create table if not exists public.chat_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  adult_confirmed_at timestamptz not null default now(),
  allow_requests boolean not null default true
);

-- One conversation per pair. user_a is always the smaller id, so a pair cannot have two.
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active')),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
create index if not exists idx_chat_conv_a on public.chat_conversations(user_a, last_message_at desc);
create index if not exists idx_chat_conv_b on public.chat_conversations(user_b, last_message_at desc);
create index if not exists idx_chat_conv_requester on public.chat_conversations(requested_by, created_at);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_msg_conv on public.chat_messages(conversation_id, id desc);
create index if not exists idx_chat_msg_sender on public.chat_messages(sender_id, created_at);

create table if not exists public.chat_reads (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_id bigint not null default 0,
  primary key (conversation_id, user_id)
);

-- A deleted request is hidden from the person who deleted it. It is kept apart from the
-- conversation so the sender cannot find out: to them it still looks like it is waiting.
create table if not exists public.chat_declines (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Reports keep a copy of the recent messages, so the evidence survives if an account is deleted.
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.chat_conversations(id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'sexual', 'scam', 'underage', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  -- who dealt with it, when, and what they decided
  handled_by text,
  handled_at timestamptz,
  admin_note text not null default '' check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_reports_open on public.chat_reports(status, created_at desc);

-- A suspended person cannot send, start or accept chats. They can still read, block and report.
create table if not exists public.chat_suspensions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  suspended_by text not null,
  suspended_at timestamptz not null default now()
);

-- Every suspend and restore is kept: who did it, when and why. It outlives the account.
create table if not exists public.chat_moderation_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('suspend', 'restore')),
  reason text not null,
  admin text not null,
  report_id uuid references public.chat_reports(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_modlog_user on public.chat_moderation_log(user_id, created_at desc);

-- ---------------------------------------------------------------- who may read what

alter table public.chat_settings enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reads enable row level security;
alter table public.chat_declines enable row level security;
alter table public.chat_blocks enable row level security;
alter table public.chat_reports enable row level security;
alter table public.chat_suspensions enable row level security;
alter table public.chat_moderation_log enable row level security;
-- No grants and no policies: people never read these. Only the server does.
revoke all on public.chat_suspensions, public.chat_moderation_log from anon, authenticated;
-- The log is a record: even the server may only add to it and read it.
revoke update, delete, truncate on public.chat_moderation_log from service_role;

-- Signed-in people may only read; visitors get nothing at all.
revoke all on public.chat_settings, public.chat_conversations, public.chat_messages, public.chat_reads,
  public.chat_declines, public.chat_blocks, public.chat_reports from anon, authenticated;
grant select on public.chat_settings, public.chat_conversations, public.chat_messages, public.chat_reads,
  public.chat_declines, public.chat_blocks to authenticated;

drop policy if exists "own chat settings" on public.chat_settings;
create policy "own chat settings" on public.chat_settings for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "own conversations" on public.chat_conversations;
create policy "own conversations" on public.chat_conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));

drop policy if exists "messages of own conversations" on public.chat_messages;
create policy "messages of own conversations" on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.chat_conversations c
    where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
  ));

-- Read markers are private: no "seen" receipts in version 1.
drop policy if exists "own read markers" on public.chat_reads;
create policy "own read markers" on public.chat_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "own declines" on public.chat_declines;
create policy "own declines" on public.chat_declines for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "own blocks" on public.chat_blocks;
create policy "own blocks" on public.chat_blocks for select to authenticated
  using (blocker_id = auth.uid());

-- chat_reports has no policy and no grant: only the server (service role) reads reports.

-- ---------------------------------------------------------------- helpers (not callable by people)

create or replace function public.chat_me()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  if not exists (select 1 from chat_settings where user_id = auth.uid()) then
    raise exception 'chat:turn-on-chat';
  end if;
  return auth.uid();
end $$;

create or replace function public.chat_blocked(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_blocks
                 where (blocker_id = x and blocked_id = y) or (blocker_id = y and blocked_id = x));
$$;

create or replace function public.chat_suspended(x uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from chat_suspensions where user_id = x);
$$;

create or replace function public.chat_mutual(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from author_follows where follower_id = x and author_id = y)
     and exists (select 1 from author_follows where follower_id = y and author_id = x);
$$;

create or replace function public.chat_clean(p_body text, p_max int)
returns text language plpgsql immutable as $$
declare v text := btrim(coalesce(p_body, ''), E' \t\r\n');
begin
  if v = '' then raise exception 'chat:empty-message'; end if;
  if char_length(v) > p_max then raise exception 'chat:message-too-long'; end if;
  return v;
end $$;

-- Requests go to people who have not agreed to hear from the sender, so they carry no links.
create or replace function public.chat_has_link(p_body text)
returns boolean language sql immutable as $$
  select p_body ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|io|ng|me|co|ly|xyz|info|app|link|site|online|shop|top)\M)';
$$;

create or replace function public.chat_check_rate(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from chat_messages where sender_id = p_user and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'chat:slow-down';
  end if;
end $$;

create or replace function public.chat_post(p_conversation uuid, p_sender uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into chat_messages (conversation_id, sender_id, body) values (p_conversation, p_sender, p_body) returning id into v_id;
  update chat_conversations set last_message_at = now() where id = p_conversation;
  insert into chat_reads (conversation_id, user_id, last_read_id) values (p_conversation, p_sender, v_id)
    on conflict (conversation_id, user_id) do update set last_read_id = excluded.last_read_id;
end $$;

-- ---------------------------------------------------------------- what people can do

create or replace function public.chat_enable(p_is_adult boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  if p_is_adult is not true then raise exception 'chat:adults-only'; end if;
  insert into chat_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end $$;

create or replace function public.chat_set_requests(p_allow boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update chat_settings set allow_requests = coalesce(p_allow, false) where user_id = chat_me();
end $$;

-- Sends a message in an existing conversation.
create or replace function public.chat_send(p_conversation uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := chat_me();
  c chat_conversations;
  other uuid;
  v_body text := chat_clean(p_body, 2000);
begin
  -- one message at a time per sender, so limits cannot be raced
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  select * into c from chat_conversations where id = p_conversation and me in (user_a, user_b) for update;
  if not found then raise exception 'chat:not-found'; end if;
  other := case when c.user_a = me then c.user_b else c.user_a end;
  -- the same answer for every closed door, so a block is not revealed
  if chat_blocked(me, other) or chat_suspended(other) or not exists (select 1 from chat_settings where user_id = other) then
    raise exception 'chat:unavailable';
  end if;

  if c.status = 'pending' then
    if me = c.requested_by then
      -- the sender can only go further once both follow each other and the request was not deleted
      if not chat_mutual(me, other) or exists (select 1 from chat_declines where conversation_id = c.id) then
        raise exception 'chat:waiting-for-reply';
      end if;
      update chat_conversations set status = 'active' where id = c.id;
    else
      raise exception 'chat:accept-first';
    end if;
  end if;

  perform chat_check_rate(me);
  perform chat_post(c.id, me, v_body);
  return c.id;
end $$;

-- Starts a chat with someone, or continues the one that exists.
create or replace function public.chat_start(p_to uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := chat_me();
  c chat_conversations;
  v_allow boolean;
  v_mutual boolean;
  v_body text;
  v_id uuid;
begin
  if p_to is null or p_to = me then raise exception 'chat:unavailable'; end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  perform pg_advisory_xact_lock(hashtext('chatpair:' || least(me, p_to)::text || greatest(me, p_to)::text));

  select * into c from chat_conversations where user_a = least(me, p_to) and user_b = greatest(me, p_to);
  if found then
    -- writing to someone whose request is waiting for you accepts it
    if c.status = 'pending' and c.requested_by = p_to then perform chat_respond(c.id, true); end if;
    return chat_send(c.id, p_body);
  end if;

  select allow_requests into v_allow from chat_settings where user_id = p_to;
  if not found or chat_blocked(me, p_to) or chat_suspended(p_to) then raise exception 'chat:unavailable'; end if;
  v_mutual := chat_mutual(me, p_to);

  if v_mutual then
    v_body := chat_clean(p_body, 2000);
  else
    if not v_allow then raise exception 'chat:unavailable'; end if;
    v_body := chat_clean(p_body, 300);
    if chat_has_link(v_body) then raise exception 'chat:no-links-in-requests'; end if;
    if (select count(*) from chat_conversations
        where requested_by = me and created_at > now() - interval '1 day' and status = 'pending') >= 10 then
      raise exception 'chat:too-many-requests';
    end if;
  end if;

  perform chat_check_rate(me);
  insert into chat_conversations (user_a, user_b, status, requested_by)
    values (least(me, p_to), greatest(me, p_to), case when v_mutual then 'active' else 'pending' end, me)
    returning id into v_id;
  perform chat_post(v_id, me, v_body);
  return v_id;
end $$;

-- Accept or delete a request. Only the person who received it can do this.
create or replace function public.chat_respond(p_conversation uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); c chat_conversations;
begin
  select * into c from chat_conversations
    where id = p_conversation and me in (user_a, user_b) and requested_by <> me and status = 'pending' for update;
  if not found then raise exception 'chat:not-found'; end if;
  if p_accept then
    if chat_suspended(me) then raise exception 'chat:suspended'; end if;
    if chat_blocked(c.user_a, c.user_b) or chat_suspended(c.requested_by) then raise exception 'chat:unavailable'; end if;
    delete from chat_declines where conversation_id = c.id;
    update chat_conversations set status = 'active' where id = c.id;
  else
    insert into chat_declines (conversation_id, user_id) values (c.id, me) on conflict do nothing;
  end if;
end $$;

create or replace function public.chat_mark_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  if not exists (select 1 from chat_conversations where id = p_conversation and me in (user_a, user_b)) then
    raise exception 'chat:not-found';
  end if;
  insert into chat_reads (conversation_id, user_id, last_read_id)
    values (p_conversation, me, coalesce((select max(id) from chat_messages where conversation_id = p_conversation), 0))
    on conflict (conversation_id, user_id) do update set last_read_id = excluded.last_read_id;
end $$;

-- Blocking and unblocking work even for someone who has not turned chat on.
create or replace function public.chat_block(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'chat:unavailable'; end if;
  insert into chat_blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
end $$;

create or replace function public.chat_unblock(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'chat:sign-in-required'; end if;
  delete from chat_blocks where blocker_id = auth.uid() and blocked_id = p_user;
end $$;

create or replace function public.chat_report(p_conversation uuid, p_reason text, p_details text default '')
returns void language plpgsql security definer set search_path = public as $$
declare c chat_conversations; me uuid := auth.uid();
begin
  if me is null then raise exception 'chat:sign-in-required'; end if;
  select * into c from chat_conversations where id = p_conversation and me in (user_a, user_b);
  if not found then raise exception 'chat:not-found'; end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if (select count(*) from chat_reports where reporter_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'chat:too-many-reports';
  end if;
  insert into chat_reports (reporter_id, reported_id, conversation_id, reason, details, evidence)
  values (
    me,
    case when c.user_a = me then c.user_b else c.user_a end,
    c.id,
    p_reason,
    left(coalesce(p_details, ''), 1000),
    coalesce((select jsonb_agg(to_jsonb(m) order by m.id)
              from (select id, sender_id, body, created_at from chat_messages
                    where conversation_id = c.id order by id desc limit 20) m), '[]'::jsonb)
  );
end $$;

-- The inbox: each conversation with the other person, the last message and the unread count.
-- Deleted requests and people you blocked are left out.
create or replace function public.chat_inbox()
returns table (
  conversation_id uuid, other_id uuid, other_name text, other_handle text, other_avatar text,
  status text, is_request boolean, last_body text, last_sender uuid, last_message_at timestamptz, unread bigint
) language sql stable security definer set search_path = public as $$
  select c.id, p.id, p.display_name::text, p.creator_handle::text, p.avatar_url::text,
         c.status,
         (c.status = 'pending' and c.requested_by <> auth.uid()),
         m.body, m.sender_id, c.last_message_at,
         (select count(*) from chat_messages u
           where u.conversation_id = c.id and u.sender_id <> auth.uid()
             and u.id > coalesce((select r.last_read_id from chat_reads r
                                  where r.conversation_id = c.id and r.user_id = auth.uid()), 0))
  from chat_conversations c
  join profiles p on p.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join lateral (select body, sender_id from chat_messages x where x.conversation_id = c.id order by x.id desc limit 1) m on true
  where auth.uid() in (c.user_a, c.user_b)
    and not exists (select 1 from chat_declines d where d.conversation_id = c.id and d.user_id = auth.uid())
    and not (c.status = 'pending' and c.requested_by <> auth.uid() and chat_suspended(c.requested_by))
    and not exists (select 1 from chat_blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.id)
  order by c.last_message_at desc
  limit 200;
$$;

-- Lets a person know their own chat is suspended. The reason and the admin stay private.
create or replace function public.chat_am_suspended()
returns boolean language sql stable security definer set search_path = public as $$
  select chat_suspended(auth.uid());
$$;

-- Server only. The change and its log entry happen together or not at all.
create or replace function public.chat_admin_set_suspension(
  p_user uuid, p_suspend boolean, p_reason text, p_admin text, p_report uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_reason text := btrim(coalesce(p_reason, ''), E' \t\r\n');
begin
  if p_suspend is null or char_length(v_reason) < 3 or char_length(v_reason) > 1000 then raise exception 'chat:reason-required'; end if;
  if coalesce(btrim(p_admin), '') = '' then raise exception 'chat:admin-required'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'chat:not-found'; end if;
  -- the same lock a send takes, so no message slips through while the suspension is being made
  perform pg_advisory_xact_lock(hashtext('chat:' || p_user::text));
  if p_suspend then
    insert into chat_suspensions (user_id, reason, suspended_by) values (p_user, v_reason, p_admin) on conflict (user_id) do nothing;
    if not found then raise exception 'chat:already-suspended'; end if;
  else
    delete from chat_suspensions where user_id = p_user;
    if not found then raise exception 'chat:not-suspended'; end if;
  end if;
  insert into chat_moderation_log (user_id, action, reason, admin, report_id)
    values (p_user, case when p_suspend then 'suspend' else 'restore' end, v_reason, p_admin, p_report);
end $$;

-- The two numbers on the Messages badge. They follow the same hiding rules as the inbox.
create or replace function public.chat_unread()
returns table (messages bigint, requests bigint) language sql stable security definer set search_path = public as $$
  with mine as (
    select c.id, (c.status = 'pending' and c.requested_by <> auth.uid()) as is_request
    from chat_conversations c
    cross join lateral (select case when c.user_a = auth.uid() then c.user_b else c.user_a end as other) o
    where auth.uid() in (c.user_a, c.user_b)
      and not exists (select 1 from chat_declines d where d.conversation_id = c.id and d.user_id = auth.uid())
      and not exists (select 1 from chat_blocks b where b.blocker_id = auth.uid() and b.blocked_id = o.other)
      and not (c.status = 'pending' and c.requested_by <> auth.uid() and chat_suspended(c.requested_by))
  )
  select
    (select count(*) from chat_messages u join mine m on m.id = u.conversation_id
      where not m.is_request and u.sender_id <> auth.uid()
        and u.id > coalesce((select r.last_read_id from chat_reads r
                             where r.conversation_id = u.conversation_id and r.user_id = auth.uid()), 0)),
    (select count(*) from mine where is_request);
$$;
revoke all on function public.chat_unread() from public, anon;
grant execute on function public.chat_unread() to authenticated;

-- ---------------------------------------------------------------- function permissions

revoke all on function public.chat_suspended(uuid), public.chat_admin_set_suspension(uuid, boolean, text, text, uuid) from public, anon, authenticated;
grant execute on function public.chat_admin_set_suspension(uuid, boolean, text, text, uuid) to service_role;
revoke all on function public.chat_am_suspended() from public, anon;
grant execute on function public.chat_am_suspended() to authenticated;

-- Helpers are for the functions above only.
revoke all on function public.chat_me(), public.chat_blocked(uuid, uuid), public.chat_mutual(uuid, uuid),
  public.chat_clean(text, int), public.chat_has_link(text), public.chat_check_rate(uuid),
  public.chat_post(uuid, uuid, text) from public, anon, authenticated;

revoke all on function public.chat_enable(boolean), public.chat_set_requests(boolean), public.chat_send(uuid, text),
  public.chat_start(uuid, text), public.chat_respond(uuid, boolean), public.chat_mark_read(uuid),
  public.chat_block(uuid), public.chat_unblock(uuid), public.chat_report(uuid, text, text), public.chat_inbox()
  from public, anon;
grant execute on function public.chat_enable(boolean), public.chat_set_requests(boolean), public.chat_send(uuid, text),
  public.chat_start(uuid, text), public.chat_respond(uuid, boolean), public.chat_mark_read(uuid),
  public.chat_block(uuid), public.chat_unblock(uuid), public.chat_report(uuid, text, text), public.chat_inbox()
  to authenticated;

-- Live updates. Supabase applies the read rules above to new and changed rows before sending them.
-- Only these two tables are published. Supabase cannot apply read rules to deletions, and sends the
-- deleted row's key to listeners, so tables whose keys name people (read markers, blocks, declines,
-- suspensions) must stay out. The keys of these two say nothing about who was talking.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['chat_messages', 'chat_conversations'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
