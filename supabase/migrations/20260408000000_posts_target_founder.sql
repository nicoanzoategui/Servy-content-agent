-- Audiencia founder (marca personal) para posts del kanban.
alter table public.posts
  drop constraint if exists posts_target_check;

alter table public.posts
  add constraint posts_target_check
  check (target in ('user', 'provider', 'both', 'founder'));
