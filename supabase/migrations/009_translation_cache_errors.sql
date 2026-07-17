-- ANYFREEBOOK migration 009: persistent translation cache + client error log
-- Both tables are service-role only (no public RLS policies): the API routes
-- write/read them with the service key; browsers never touch them directly.

create table if not exists public.translation_cache (
  lang text not null,
  source_hash text not null,          -- sha1 of the English source string
  source_text text not null,
  translated text not null,
  created_at timestamptz default now(),
  primary key (lang, source_hash)
);

create table if not exists public.client_errors (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists idx_client_errors_time on public.client_errors(created_at desc);

alter table public.translation_cache enable row level security;
alter table public.client_errors enable row level security;
