-- Study Room: a shared shelf of notes and books inside a group, with page questions and a calm,
-- optional way to study together. Run after 023_group_admin_controls.sql.
--
-- Any member may add notes or an ANYFREEBOOK publication. Study material and questions are a shared
-- shelf: everyone in the group sees them, including people who join later (the screens say so).
-- A question can be asked without a name. Other members and the group admin never see who asked;
-- the account is still recorded, so a safety report can reach the right person.
-- Presenting, the shared focus timer and tidying up need the "announce" or "moderate" helper powers.
-- Nothing here ranks people or counts streaks.
-- Limits: 30 items per group, 30,000 characters a note, 10 new items and 30 questions or answers a
-- person a day.

-- ---------------------------------------------------------------- tables

create table if not exists public.chat_study_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  kind text not null check (kind in ('note', 'book')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null default '' check (char_length(body) <= 30000),
  publication_id uuid references public.publications(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'note' and publication_id is null and char_length(body) > 0)
      or (kind = 'book' and publication_id is not null and body = ''))
);
create index if not exists idx_chat_study_items on public.chat_study_items(group_id, created_at desc);

create table if not exists public.chat_study_questions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.chat_study_items(id) on delete cascade,
  page int not null check (page between 1 and 10000),
  author_id uuid not null references public.profiles(id) on delete cascade,
  anonymous boolean not null default false,
  body text not null check (char_length(body) between 1 and 500),
  answered boolean not null default false,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_study_questions on public.chat_study_questions(item_id, created_at);
create index if not exists idx_chat_study_questions_author on public.chat_study_questions(author_id, created_at);

create table if not exists public.chat_study_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.chat_study_questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_study_answers on public.chat_study_answers(question_id, created_at);
create index if not exists idx_chat_study_answers_author on public.chat_study_answers(author_id, created_at);

-- What the room is doing right now: who is presenting which page, and the shared timer.
create table if not exists public.chat_study_rooms (
  group_id uuid primary key references public.chat_groups(id) on delete cascade,
  presenter_id uuid references public.profiles(id) on delete set null,
  item_id uuid references public.chat_study_items(id) on delete set null,
  page int not null default 1,
  presented_at timestamptz,
  timer_kind text check (timer_kind in ('focus', 'break')),
  timer_ends_at timestamptz
);

-- Everything is read and changed only through the functions below. In particular nobody can read
-- the question table directly, or a "no name" question would have a name.
alter table public.chat_study_items enable row level security;
alter table public.chat_study_questions enable row level security;
alter table public.chat_study_answers enable row level security;
alter table public.chat_study_rooms enable row level security;
revoke all on public.chat_study_items, public.chat_study_questions, public.chat_study_answers, public.chat_study_rooms
  from anon, authenticated;

-- ---------------------------------------------------------------- helpers (not callable by people)

-- Checks the person may add to the shelf right now, and locks the group.
create or replace function public.chat_study_writer(p_group uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  if exists (select 1 from chat_group_timeouts where group_id = p_group and user_id = me and until > clock_timestamp()) then
    raise exception 'chat:timed-out';
  end if;
  return me;
end $$;

-- The item, if it is on this group's shelf and the person asking can see it.
create or replace function public.chat_study_visible_item(p_group uuid, p_item uuid)
returns public.chat_study_items language plpgsql stable security definer set search_path = public as $$
declare i chat_study_items;
begin
  if not chat_group_is_member(p_group, auth.uid()) then raise exception 'chat:not-found'; end if;
  select * into i from chat_study_items x
    where x.id = p_item and x.group_id = p_group and x.removed_at is null
      and (x.added_by is null or not chat_blocked(auth.uid(), x.added_by));
  if not found then raise exception 'chat:not-found'; end if;
  return i;
end $$;

create or replace function public.chat_study_visible_question(p_group uuid, p_question uuid)
returns public.chat_study_questions language plpgsql stable security definer set search_path = public as $$
declare q chat_study_questions;
begin
  select x.* into q from chat_study_questions x where x.id = p_question and x.removed_at is null;
  if not found then raise exception 'chat:not-found'; end if;
  perform chat_study_visible_item(p_group, q.item_id);
  -- a block never hides a "no name" question: hiding it would show who asked
  if not q.anonymous and chat_blocked(auth.uid(), q.author_id) then raise exception 'chat:not-found'; end if;
  return q;
end $$;

create or replace function public.chat_study_check_posts(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from chat_study_questions where author_id = p_user and created_at > now() - interval '1 day')
   + (select count(*) from chat_study_answers where author_id = p_user and created_at > now() - interval '1 day') >= 30 then
    raise exception 'chat:too-many-questions';
  end if;
end $$;

-- ---------------------------------------------------------------- the shelf

create or replace function public.chat_study_add_note(p_group uuid, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := chat_study_writer(p_group);
  v_title text := btrim(coalesce(p_title, ''), E' \t\r\n');
  v_body text := btrim(coalesce(p_body, ''), E' \t\r\n');
  v_id uuid;
begin
  if char_length(v_title) < 3 or char_length(v_title) > 120 then raise exception 'chat:note-title'; end if;
  if v_body = '' then raise exception 'chat:empty-message'; end if;
  if char_length(v_body) > 30000 then raise exception 'chat:note-too-long'; end if;
  if (select count(*) from chat_study_items where group_id = p_group and removed_at is null) >= 30 then
    raise exception 'chat:shelf-full';
  end if;
  if (select count(*) from chat_study_items where added_by = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'chat:too-many-notes';
  end if;
  insert into chat_study_items (group_id, kind, title, body, added_by) values (p_group, 'note', v_title, v_body, me)
    returning id into v_id;
  return v_id;
end $$;

-- Adds a published ANYFREEBOOK work by its address name (slug).
create or replace function public.chat_study_add_book(p_group uuid, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := chat_study_writer(p_group); p record; v_id uuid;
begin
  select id, title into p from publications where slug = p_slug and status = 'published';
  if not found then raise exception 'chat:book-not-found'; end if;
  select id into v_id from chat_study_items where group_id = p_group and publication_id = p.id and removed_at is null;
  if found then return v_id; end if;
  if (select count(*) from chat_study_items where group_id = p_group and removed_at is null) >= 30 then
    raise exception 'chat:shelf-full';
  end if;
  if (select count(*) from chat_study_items where added_by = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'chat:too-many-notes';
  end if;
  insert into chat_study_items (group_id, kind, title, publication_id, added_by)
    values (p_group, 'book', left(rpad(p.title, 3, '.'), 120), p.id, me) returning id into v_id;
  return v_id;
end $$;

create or replace function public.chat_study_shelf(p_group uuid)
returns table (item_id uuid, kind text, title text, slug text, added_by_name text, can_remove boolean, open_questions bigint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.kind, i.title,
    -- a book that has since been unpublished keeps its place but loses its link
    case when p.status = 'published' then p.slug end,
    coalesce(a.display_name::text, a.creator_handle::text, 'Former member'),
    coalesce(i.added_by = auth.uid(), false) or chat_group_may(p_group, auth.uid(), 'moderate'),
    (select count(*) from chat_study_questions q where q.item_id = i.id and q.removed_at is null and not q.answered
       and (q.anonymous or not chat_blocked(auth.uid(), q.author_id))),
    i.created_at
  from chat_study_items i
  left join publications p on p.id = i.publication_id
  left join profiles a on a.id = i.added_by
  where i.group_id = p_group and i.removed_at is null and chat_group_is_member(p_group, auth.uid())
    and (i.added_by is null or not chat_blocked(auth.uid(), i.added_by))
  order by i.created_at desc;
$$;

-- The text of one note.
create or replace function public.chat_study_read(p_group uuid, p_item uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare i chat_study_items := chat_study_visible_item(p_group, p_item);
begin
  return i.body;
end $$;

create or replace function public.chat_study_remove_item(p_group uuid, p_item uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  update chat_study_items set removed_at = now()
    where id = p_item and group_id = p_group and removed_at is null
      and (added_by = me or chat_group_may(p_group, me, 'moderate'));
  if not found then raise exception 'chat:not-found'; end if;
  update chat_study_rooms set presenter_id = null, item_id = null, presented_at = null
    where group_id = p_group and item_id = p_item;
end $$;

-- ---------------------------------------------------------------- page questions

create or replace function public.chat_study_ask(p_group uuid, p_item uuid, p_page int, p_body text, p_anonymous boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := chat_study_writer(p_group); v_body text := chat_clean(p_body, 500); v_id uuid;
begin
  perform chat_study_visible_item(p_group, p_item);
  if p_page is null or p_page < 1 or p_page > 10000 then raise exception 'chat:unavailable'; end if;
  perform chat_study_check_posts(me);
  insert into chat_study_questions (item_id, page, author_id, anonymous, body)
    values (p_item, p_page, me, coalesce(p_anonymous, false), v_body) returning id into v_id;
  return v_id;
end $$;

create or replace function public.chat_study_answer(p_group uuid, p_question uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_study_writer(p_group); v_body text := chat_clean(p_body, 1000);
begin
  perform chat_study_visible_question(p_group, p_question);
  perform chat_study_check_posts(me);
  insert into chat_study_answers (question_id, author_id, body) values (p_question, me, v_body);
end $$;

-- Questions on one item, with their answers. A "no name" question carries no name and no account id,
-- except to say "this one is yours" to the person who asked it.
create or replace function public.chat_study_questions_for(p_group uuid, p_item uuid)
returns table (question_id uuid, page int, body text, author_name text, mine boolean, answered boolean,
               can_remove boolean, can_resolve boolean, answers jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); mod boolean;
begin
  perform chat_study_visible_item(p_group, p_item);
  mod := chat_group_may(p_group, me, 'moderate');
  return query
    select q.id, q.page, q.body,
      case when q.anonymous then null else coalesce(p.display_name::text, p.creator_handle::text, 'Reader') end,
      q.author_id = me, q.answered,
      q.author_id = me or mod,
      q.author_id = me or mod,
      coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'body', a.body, 'name',
                    -- the asker answering their own "no name" question stays unnamed
                    case when q.anonymous and a.author_id = q.author_id then null
                         else coalesce(ap.display_name::text, ap.creator_handle::text, 'Reader') end,
                    'mine', a.author_id = me, 'canRemove', a.author_id = me or mod) order by a.created_at, a.id)
                from chat_study_answers a join profiles ap on ap.id = a.author_id
                where a.question_id = q.id and a.removed_at is null
                  and ((q.anonymous and a.author_id = q.author_id) or not chat_blocked(me, a.author_id))), '[]'::jsonb),
      q.created_at
    from chat_study_questions q join profiles p on p.id = q.author_id
    where q.item_id = p_item and q.removed_at is null and (q.anonymous or not chat_blocked(me, q.author_id))
    order by q.page, q.created_at, q.id
    limit 200;
end $$;

create or replace function public.chat_study_resolve(p_group uuid, p_question uuid, p_answered boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); q chat_study_questions;
begin
  q := chat_study_visible_question(p_group, p_question);
  if q.author_id <> me and not chat_group_may(p_group, me, 'moderate') then raise exception 'chat:not-found'; end if;
  update chat_study_questions set answered = coalesce(p_answered, false) where id = q.id;
end $$;

-- Removes a question, or with p_answer one answer. Kept for reports.
create or replace function public.chat_study_remove_post(p_group uuid, p_question uuid, p_answer uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me(); q chat_study_questions; mod boolean;
begin
  q := chat_study_visible_question(p_group, p_question);
  mod := chat_group_may(p_group, me, 'moderate');
  if p_answer is null then
    if q.author_id <> me and not mod then raise exception 'chat:not-found'; end if;
    update chat_study_questions set removed_at = now() where id = q.id;
  else
    update chat_study_answers set removed_at = now()
      where id = p_answer and question_id = q.id and removed_at is null and (author_id = me or mod);
    if not found then raise exception 'chat:not-found'; end if;
  end if;
end $$;

-- Reports a note, a question or an answer. p_kind says which; p_target is its id.
create or replace function public.chat_study_report(p_group uuid, p_kind text, p_target uuid, p_reason text, p_details text default '')
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); i chat_study_items; q chat_study_questions; a chat_study_answers; v_who uuid; v_text text; v_when timestamptz;
begin
  if me is null then raise exception 'chat:sign-in-required'; end if;
  if p_kind = 'item' then
    i := chat_study_visible_item(p_group, p_target);
    v_who := i.added_by; v_when := i.created_at;
    v_text := 'Study item: ' || i.title || E'\n' || left(i.body, 2000);
  elsif p_kind = 'question' then
    q := chat_study_visible_question(p_group, p_target);
    v_who := q.author_id; v_when := q.created_at; v_text := 'Study question: ' || q.body;
  elsif p_kind = 'answer' then
    select * into a from chat_study_answers where id = p_target and removed_at is null;
    if not found then raise exception 'chat:not-found'; end if;
    perform chat_study_visible_question(p_group, a.question_id);
    v_who := a.author_id; v_when := a.created_at; v_text := 'Study answer: ' || a.body;
  else
    raise exception 'chat:not-found';
  end if;
  -- "your own" gets the same answer as a missing one, so nothing is learnt about a "no name" post
  if v_who = me then raise exception 'chat:not-found'; end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || me::text));
  if (select count(*) from chat_reports where reporter_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'chat:too-many-reports';
  end if;
  insert into chat_reports (reporter_id, reported_id, group_id, reason, details, evidence)
    values (me, v_who, p_group, p_reason, left(coalesce(p_details, ''), 1000),
      jsonb_build_array(jsonb_build_object('id', 0, 'sender_id', v_who, 'body', v_text, 'created_at', v_when)));
end $$;

-- ---------------------------------------------------------------- studying together

-- Shows everyone who chooses to follow which page the presenter is on.
create or replace function public.chat_study_present(p_group uuid, p_item uuid, p_page int)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'announce'); me uuid := auth.uid(); r chat_study_rooms;
begin
  if chat_suspended(me) then raise exception 'chat:suspended'; end if;
  perform chat_study_visible_item(g.id, p_item);
  if p_page is null or p_page < 1 or p_page > 10000 then raise exception 'chat:unavailable'; end if;
  select * into r from chat_study_rooms where group_id = g.id;
  -- someone else's live presentation is not taken over, except by the admin
  if r.presenter_id is not null and r.presenter_id <> me and r.presented_at > now() - interval '10 minutes'
     and me <> g.owner_id and chat_group_may(g.id, r.presenter_id, 'announce') then
    raise exception 'chat:someone-presenting';
  end if;
  insert into chat_study_rooms (group_id, presenter_id, item_id, page, presented_at) values (g.id, me, p_item, p_page, now())
    on conflict (group_id) do update set presenter_id = me, item_id = p_item, page = p_page, presented_at = now();
end $$;

create or replace function public.chat_study_stop_presenting(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := chat_me();
begin
  perform chat_group_lock(p_group);
  if not chat_group_is_member(p_group, me) then raise exception 'chat:not-found'; end if;
  update chat_study_rooms set presenter_id = null, item_id = null, presented_at = null
    where group_id = p_group and (presenter_id = me or exists (select 1 from chat_groups where id = p_group and owner_id = me));
end $$;

-- A timer everyone sees. 0 minutes stops it.
create or replace function public.chat_study_timer(p_group uuid, p_kind text, p_minutes int)
returns void language plpgsql security definer set search_path = public as $$
declare g chat_groups := chat_group_as_staff(p_group, 'announce');
begin
  if chat_suspended(auth.uid()) then raise exception 'chat:suspended'; end if;
  if p_minutes is null or p_minutes < 0 or p_minutes > 90 or (p_minutes > 0 and p_kind not in ('focus', 'break')) then
    raise exception 'chat:unavailable';
  end if;
  insert into chat_study_rooms (group_id, timer_kind, timer_ends_at)
    values (g.id, case when p_minutes > 0 then p_kind end, case when p_minutes > 0 then now() + make_interval(mins => p_minutes) end)
    on conflict (group_id) do update set timer_kind = excluded.timer_kind, timer_ends_at = excluded.timer_ends_at;
end $$;

-- What is happening now. A presentation left alone for 10 minutes is over.
create or replace function public.chat_study_now(p_group uuid)
returns table (presenter_name text, i_present boolean, item_id uuid, page int, timer_kind text, seconds_left int)
language sql stable security definer set search_path = public as $$
  select
    case when live.ok then coalesce(p.display_name::text, p.creator_handle::text, 'Reader') end,
    coalesce(live.ok and r.presenter_id = auth.uid(), false),
    case when live.ok then r.item_id end,
    case when live.ok then r.page end,
    case when r.timer_ends_at > now() then r.timer_kind end,
    case when r.timer_ends_at > now() then ceil(extract(epoch from r.timer_ends_at - now()))::int end
  from chat_study_rooms r
  cross join lateral (select coalesce(r.presented_at > now() - interval '10 minutes'
      and chat_group_may(p_group, r.presenter_id, 'announce')
      and not chat_blocked(auth.uid(), r.presenter_id)
      and exists (select 1 from chat_study_items i where i.id = r.item_id and i.removed_at is null
                  and (i.added_by is null or not chat_blocked(auth.uid(), i.added_by))), false) as ok) live
  left join profiles p on p.id = r.presenter_id
  where r.group_id = p_group and chat_group_is_member(p_group, auth.uid());
$$;

-- ---------------------------------------------------------------- function permissions

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname like 'chat\_study\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function
  public.chat_study_add_note(uuid, text, text), public.chat_study_add_book(uuid, text), public.chat_study_shelf(uuid),
  public.chat_study_read(uuid, uuid), public.chat_study_remove_item(uuid, uuid),
  public.chat_study_ask(uuid, uuid, int, text, boolean), public.chat_study_answer(uuid, uuid, text),
  public.chat_study_questions_for(uuid, uuid), public.chat_study_resolve(uuid, uuid, boolean),
  public.chat_study_remove_post(uuid, uuid, uuid), public.chat_study_report(uuid, text, uuid, text, text),
  public.chat_study_present(uuid, uuid, int), public.chat_study_stop_presenting(uuid),
  public.chat_study_timer(uuid, text, int), public.chat_study_now(uuid)
  to authenticated;
