-- Keeps the name "ANYFREEBOOK" for the official accounts, so nobody can pose as the team in chat,
-- groups or comments. Only a profile with an @anyfreebook.com email address may use it. Spaces,
-- punctuation, capital letters and the digit 0 for the letter o do not get around it.
-- Run after 026_chat_welcome.sql.

create or replace function public.is_reserved_name(p_name text)
returns boolean language sql immutable as $$
  select regexp_replace(replace(lower(coalesce(p_name, '')), '0', 'o'), '[^a-z]', '', 'g') like '%anyfreebook%';
$$;

create or replace function public.protect_official_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) like '%@anyfreebook.com' then return new; end if;
  if tg_op = 'INSERT' then
    -- signing up must never fail because of a name
    if is_reserved_name(new.display_name) then new.display_name := 'Reader'; end if;
    if is_reserved_name(new.creator_handle) then new.creator_handle := null; end if;
    return new;
  end if;
  if (new.display_name is distinct from old.display_name and is_reserved_name(new.display_name))
     or (new.creator_handle is distinct from old.creator_handle and is_reserved_name(new.creator_handle)) then
    raise exception 'That name is reserved for the ANYFREEBOOK team.';
  end if;
  return new;
end $$;

drop trigger if exists protect_official_name on public.profiles;
create trigger protect_official_name before insert or update of display_name, creator_handle on public.profiles
  for each row execute function public.protect_official_name();

revoke all on function public.protect_official_name() from public, anon, authenticated;
