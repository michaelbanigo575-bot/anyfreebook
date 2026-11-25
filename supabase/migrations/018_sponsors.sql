-- Homepage sponsor spots, managed from /admin/sponsors.
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('support_line','tile','shelf')),
  sponsor_name text not null,
  headline text not null default '',
  body text not null default '',
  link_url text not null default '',
  cta_label text not null default '',
  media_type text not null default 'none' check (media_type in ('none','image','video')),
  media_url text not null default '',
  extra_links jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No policies on purpose: only the server (service role) reads and writes this table.
alter table public.sponsors enable row level security;

-- Public bucket for sponsor images, GIFs and videos. Uploads go through the admin API only.
insert into storage.buckets (id, name, public)
values ('sponsors', 'sponsors', true)
on conflict (id) do nothing;
