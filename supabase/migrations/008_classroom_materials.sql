-- ANYFREEBOOK migration 008: shared class materials
-- The host can show a document (PDF/image/slides link) to everyone in the
-- room; it syncs live through the existing classroom realtime subscription.

alter table public.classrooms add column if not exists material_url text;
alter table public.classrooms add column if not exists material_title text;
