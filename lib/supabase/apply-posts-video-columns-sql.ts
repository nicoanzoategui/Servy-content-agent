/**
 * Mismo contenido ejecutable que supabase/manual/apply_posts_video_and_brief_columns.sql
 * (sin comentarios), para mostrarlo en la UI y copiar al portapapeles.
 */
export const APPLY_POSTS_VIDEO_COLUMNS_SQL = `alter table public.posts add column if not exists brief text;
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

notify pgrst, 'reload schema';`;
