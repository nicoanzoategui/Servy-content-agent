-- Consultas frecuentes: analytics, crons, UTM
create index if not exists utm_events_created_at_idx
  on public.utm_events (created_at desc);

create index if not exists utm_events_post_id_idx
  on public.utm_events (post_id)
  where post_id is not null;

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc nulls last);

create index if not exists analytics_snapshots_post_snapshot_at_idx
  on public.analytics_snapshots (post_id, snapshot_at desc);
