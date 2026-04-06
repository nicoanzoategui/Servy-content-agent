alter table public.posts
  add column if not exists regeneration_feedback text;
