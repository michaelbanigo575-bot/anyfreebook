-- Daily view and click counts per sponsor ad. No visitor data is stored, only totals.
create table if not exists public.sponsor_stats (
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  day date not null,
  views bigint not null default 0,
  clicks bigint not null default 0,
  primary key (sponsor_id, day)
);

alter table public.sponsor_stats enable row level security;

-- Adds one view or click. Only live ads are counted.
create or replace function public.track_sponsor(p_id uuid, p_event text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into sponsor_stats as t (sponsor_id, day, views, clicks)
  select s.id, (now() at time zone 'utc')::date,
         case when p_event = 'view' then 1 else 0 end,
         case when p_event = 'click' then 1 else 0 end
  from sponsors s
  where s.id = p_id and p_event in ('view', 'click') and s.active
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
  on conflict (sponsor_id, day)
  do update set views = t.views + excluded.views, clicks = t.clicks + excluded.clicks;
$$;

-- Totals per ad: all time and the last 7 days (today included).
create or replace function public.sponsor_totals()
returns table (sponsor_id uuid, views bigint, clicks bigint, views_7d bigint, clicks_7d bigint)
language sql
stable
security definer
set search_path = public
as $$
  select sponsor_id,
         sum(views)::bigint,
         sum(clicks)::bigint,
         coalesce(sum(views) filter (where day > (now() at time zone 'utc')::date - 7), 0)::bigint,
         coalesce(sum(clicks) filter (where day > (now() at time zone 'utc')::date - 7), 0)::bigint
  from sponsor_stats
  group by sponsor_id;
$$;

-- Server only.
revoke all on function public.track_sponsor(uuid, text) from public, anon, authenticated;
revoke all on function public.sponsor_totals() from public, anon, authenticated;
grant execute on function public.track_sponsor(uuid, text) to service_role;
grant execute on function public.sponsor_totals() to service_role;
