-- A welcome direct message. Run after 025_chat_trial.sql.
--
-- The site admin writes it and it is sent from the admin's own chat account, so replies come back to
-- that account. A new member receives it the moment they turn chat on; members who already had chat
-- on get it when the admin presses "send". Each person receives it once, even if the wording changes
-- later. It is never sent to someone who has not turned chat on, or between people where either has
-- blocked the other. It starts switched OFF.

create table if not exists public.chat_welcome (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null default '' check (char_length(body) <= 2000),
  updated_by text,
  updated_at timestamptz not null default now()
);
insert into public.chat_welcome (id) values (true) on conflict (id) do nothing;

-- Who has had it. Kept even if the conversation is removed, so nobody is welcomed twice.
create table if not exists public.chat_welcomed (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.chat_welcome enable row level security;
alter table public.chat_welcomed enable row level security;
revoke all on public.chat_welcome, public.chat_welcomed from anon, authenticated;

-- Welcomes are automatic, so they must not use up the sender's own sending limit.
alter table public.chat_messages add column if not exists is_welcome boolean not null default false;

create or replace function public.chat_check_rate(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from chat_messages where sender_id = p_user and not is_welcome and created_at > now() - interval '1 minute')
   + (select count(*) from chat_group_messages where sender_id = p_user and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'chat:slow-down';
  end if;
end $$;

-- Sends the welcome to one person, if it should go. Returns true if it was sent.
create or replace function public.chat_send_welcome(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare w chat_welcome; v_conversation uuid; v_id bigint;
begin
  select * into w from chat_welcome where id;
  if not found or not w.enabled or w.sender_id is null or w.sender_id = p_user or btrim(w.body) = '' then return false; end if;
  if not exists (select 1 from chat_settings where user_id = p_user)
     or not exists (select 1 from chat_settings where user_id = w.sender_id)
     or chat_suspended(w.sender_id) or chat_blocked(w.sender_id, p_user) or not chat_allowed(p_user) then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('chatpair:' || least(w.sender_id, p_user)::text || greatest(w.sender_id, p_user)::text));
  insert into chat_welcomed (user_id) values (p_user) on conflict (user_id) do nothing;
  if not found then return false; end if;

  insert into chat_conversations (user_a, user_b, status, requested_by)
    values (least(w.sender_id, p_user), greatest(w.sender_id, p_user), 'active', w.sender_id)
    on conflict (user_a, user_b) do update set status = 'active'
    returning id into v_conversation;
  delete from chat_declines where conversation_id = v_conversation;
  insert into chat_messages (conversation_id, sender_id, body, is_welcome)
    values (v_conversation, w.sender_id, w.body, true) returning id into v_id;
  update chat_conversations set last_message_at = now() where id = v_conversation;
  -- the sender has "read" their own welcome only if nothing from the other person is waiting
  insert into chat_reads (conversation_id, user_id, last_read_id) values (v_conversation, w.sender_id, v_id)
    on conflict (conversation_id, user_id) do nothing;
  return true;
end $$;

create or replace function public.chat_welcome_new_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- a problem with the welcome must never stop someone turning chat on
  begin
    perform chat_send_welcome(new.user_id);
  exception when others then
    raise warning 'welcome message not sent: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists chat_welcome_new_member on public.chat_settings;
create trigger chat_welcome_new_member after insert on public.chat_settings
  for each row execute function public.chat_welcome_new_member();

-- Server only: save the wording. The sender is the signed-in admin, who must have chat on.
create or replace function public.chat_admin_set_welcome(p_sender uuid, p_body text, p_enabled boolean, p_admin text)
returns void language plpgsql security definer set search_path = public as $$
declare v_body text := btrim(coalesce(p_body, ''), E' \t\r\n');
begin
  if coalesce(btrim(p_admin), '') = '' then raise exception 'chat:admin-required'; end if;
  if char_length(v_body) > 2000 then raise exception 'chat:message-too-long'; end if;
  if p_enabled is true then
    if v_body = '' then raise exception 'chat:empty-message'; end if;
    if not exists (select 1 from chat_settings where user_id = p_sender) then raise exception 'chat:turn-on-chat'; end if;
    if chat_suspended(p_sender) then raise exception 'chat:suspended'; end if;
  end if;
  insert into chat_welcome (id, enabled, sender_id, body, updated_by, updated_at)
    values (true, coalesce(p_enabled, false), p_sender, v_body, p_admin, now())
    on conflict (id) do update set enabled = excluded.enabled, sender_id = excluded.sender_id,
      body = excluded.body, updated_by = excluded.updated_by, updated_at = now();
end $$;

-- How many members with chat on have not had the welcome and could receive it.
create or replace function public.chat_admin_welcome_waiting()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from chat_settings s cross join chat_welcome w
  where w.id and w.sender_id is not null and s.user_id <> w.sender_id
    and not exists (select 1 from chat_welcomed x where x.user_id = s.user_id)
    and not chat_blocked(w.sender_id, s.user_id) and chat_allowed(s.user_id);
$$;

-- Sends it to members who were here before, up to 200 at a time. Returns how many were sent.
create or replace function public.chat_admin_welcome_existing()
returns int language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_sent int := 0;
begin
  for v_user in
    select s.user_id from chat_settings s cross join chat_welcome w
    where w.id and w.enabled and s.user_id <> w.sender_id
      and not exists (select 1 from chat_welcomed x where x.user_id = s.user_id)
      and not chat_blocked(w.sender_id, s.user_id) and chat_allowed(s.user_id)
    order by s.adult_confirmed_at limit 200
  loop
    if chat_send_welcome(v_user) then v_sent := v_sent + 1; end if;
  end loop;
  return v_sent;
end $$;

revoke all on function public.chat_check_rate(uuid), public.chat_send_welcome(uuid), public.chat_welcome_new_member(),
  public.chat_admin_set_welcome(uuid, text, boolean, text), public.chat_admin_welcome_waiting(), public.chat_admin_welcome_existing()
  from public, anon, authenticated;
grant execute on function public.chat_admin_set_welcome(uuid, text, boolean, text),
  public.chat_admin_welcome_waiting(), public.chat_admin_welcome_existing() to service_role;
