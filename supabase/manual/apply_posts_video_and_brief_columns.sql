-- Ejecutar en Supabase → SQL Editor si aparece:
-- "Could not find the 'video_category' column of 'posts' in the schema cache"
--
-- Idempotente: safe repetir. Luego esperá ~1 min o recargá esquema en
-- Project Settings → API → "Reload schema" (si está disponible).

alter table public.posts add column if not exists brief text;
alter table public.posts add column if not exists regeneration_feedback text;

alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists video_duration integer;
alter table public.posts add column if not exists video_prompt text;
alter table public.posts add column if not exists video_content_type text;
alter table public.posts add column if not exists video_tone text;
alter table public.posts add column if not exists video_category text;
alter table public.posts add column if not exists video_duration_seconds integer;

alter table public.posts drop constraint if exists posts_target_check;
alter table public.posts
  add constraint posts_target_check
  check (target in ('user', 'provider', 'both', 'founder'));

-- Avisar a PostgREST para refrescar el caché de columnas
notify pgrst, 'reload schema';
