-- Video generation (fal.ai Kling v1.6) — spec video_spec.md
alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists video_duration integer;
alter table public.posts add column if not exists video_prompt text;
alter table public.posts add column if not exists video_content_type text;
alter table public.posts add column if not exists video_tone text;
alter table public.posts add column if not exists video_category text;
alter table public.posts add column if not exists video_duration_seconds integer;
