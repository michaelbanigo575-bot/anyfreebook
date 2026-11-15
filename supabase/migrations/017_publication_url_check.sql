-- A publication's attached-file link must be a public https address.
-- Enforced in the database so it holds even if a client skips the form check.
-- NOT VALID: existing rows are left alone, every new or changed row is checked.
alter table public.publications
  drop constraint if exists publications_external_url_public_https;

alter table public.publications
  add constraint publications_external_url_public_https
  check (
    external_url is null
    or external_url = ''
    or (
      external_url ~* '^https://[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]+)?(/|$)'
      and external_url !~* '^https://([^/]*@|localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
      and external_url !~* '\.(local|internal|localhost)(:[0-9]+)?(/|$)'
    )
  ) not valid;
