-- Servy Content Agent — initial schema (spec §4)
-- Requires: pgcrypto for gen_random_uuid() (enabled by default on Supabase)

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- strategy — archivo madre (marca Servy)
-- ---------------------------------------------------------------------------
create table public.strategy (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,

  brand_context jsonb not null,
  insights jsonb not null default '[]'::jsonb,
  current_rules jsonb not null default '{}'::jsonb,
  weekly_plan jsonb not null default '[]'::jsonb,
  changelog jsonb not null default '[]'::jsonb
);

create trigger strategy_set_updated_at
  before update on public.strategy
  for each row
  execute function public.set_updated_at();

alter table public.strategy enable row level security;

-- ---------------------------------------------------------------------------
-- founder_strategy — archivo madre del founder
-- ---------------------------------------------------------------------------
create table public.founder_strategy (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,

  founder_notes text,
  recent_decisions text,
  recent_mistakes text,
  "references" jsonb not null default '[]'::jsonb,
  servy_metrics_snapshot jsonb not null default '{}'::jsonb,
  insights jsonb not null default '[]'::jsonb,
  current_rules jsonb not null default '{}'::jsonb,
  weekly_plan jsonb not null default '[]'::jsonb,
  changelog jsonb not null default '[]'::jsonb
);

create trigger founder_strategy_set_updated_at
  before update on public.founder_strategy
  for each row
  execute function public.set_updated_at();

alter table public.founder_strategy enable row level security;

-- ---------------------------------------------------------------------------
-- posts — kanban
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  title text not null,
  format text not null
    check (format in ('feed_image', 'story', 'reel', 'feed_carousel')),
  objective text not null
    check (objective in ('awareness', 'engagement', 'conversion', 'retention')),
  target text not null
    check (target in ('user', 'provider', 'both')),
  service_category text,
  scheduled_at timestamptz,

  status text not null default 'todo'
    check (status in ('todo', 'generating', 'review', 'approved', 'published', 'failed')),

  copy text,
  hashtags text[],
  cta_text text,
  image_prompt text,
  image_url text,
  image_urls text[],
  selected_image_index integer not null default 0,
  video_brief text,

  meta_post_id text,
  published_at timestamptz,
  published_url text,

  metrics jsonb not null default '{}'::jsonb,
  metrics_fetched_at timestamptz,

  approved_by text,
  rejection_reason text,
  generation_attempts integer not null default 0
);

create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

create index posts_status_idx on public.posts (status);
create index posts_scheduled_at_idx on public.posts (scheduled_at);

alter table public.posts enable row level security;

-- ---------------------------------------------------------------------------
-- analytics_snapshots
-- ---------------------------------------------------------------------------
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  hours_after_publish integer,
  metrics jsonb not null
);

create index analytics_snapshots_post_id_idx on public.analytics_snapshots (post_id);

alter table public.analytics_snapshots enable row level security;

-- ---------------------------------------------------------------------------
-- utm_events
-- ---------------------------------------------------------------------------
create table public.utm_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid references public.posts (id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  event_type text,
  session_id text,
  user_agent text
);

create index utm_events_post_id_idx on public.utm_events (post_id);
create index utm_events_created_at_idx on public.utm_events (created_at);

alter table public.utm_events enable row level security;
