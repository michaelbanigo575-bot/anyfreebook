-- Five reactions instead of a single like. Existing likes become "love".
alter table public.publication_likes
  add column if not exists reaction text not null default 'love';

alter table public.publication_likes
  drop constraint if exists publication_likes_reaction_check;

alter table public.publication_likes
  add constraint publication_likes_reaction_check
  check (reaction in ('love', 'insightful', 'brilliant', 'enjoyed', 'helpful'));
