-- Consolidated cinematic_projects migrations (0014-0019)
-- Run once in Supabase Dashboard -> SQL Editor -> New query
-- Idempotent: safe to re-run (IF NOT EXISTS / drop policy if exists)
-- ========== 0014_cinematic_projects.sql ==========
-- MUGTEE â€” Lightweight cinematic creator project persistence.
-- Single table, no over-normalization. Owner-only via RLS.

create table if not exists public.cinematic_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled project',
  prompt      text not null default '',
  style       text not null default 'cinematic',
  duration    integer not null default 60,
  script      text not null default '',
  scenes      jsonb not null default '[]'::jsonb,
  voice       jsonb,
  captions    jsonb not null default '{"text":""}'::jsonb,
  status      text not null default 'create',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists cinematic_projects_user_updated_idx
  on public.cinematic_projects (user_id, updated_at desc);

alter table public.cinematic_projects enable row level security;

drop policy if exists "cinematic_projects self read" on public.cinematic_projects;
create policy "cinematic_projects self read"
  on public.cinematic_projects for select
  using (auth.uid() = user_id);

drop policy if exists "cinematic_projects self insert" on public.cinematic_projects;
create policy "cinematic_projects self insert"
  on public.cinematic_projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "cinematic_projects self update" on public.cinematic_projects;
create policy "cinematic_projects self update"
  on public.cinematic_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cinematic_projects self delete" on public.cinematic_projects;
create policy "cinematic_projects self delete"
  on public.cinematic_projects for delete
  using (auth.uid() = user_id);

-- ========== 0015_project_video_urls.sql ==========
-- Faceless render outputs on cinematic_projects
alter table public.cinematic_projects
  add column if not exists video_url text,
  add column if not exists thumbnail_url text;

-- ========== 0016_unified_projects.sql ==========
-- Unified creator OS â€” mode + Virlo metadata on cinematic_projects.
-- video_url / thumbnail_url already added in 0015.

alter table public.cinematic_projects
  add column if not exists mode text not null default 'director',
  add column if not exists virlo jsonb;

create index if not exists cinematic_projects_user_mode_idx
  on public.cinematic_projects (user_id, mode, updated_at desc);

-- ========== 0017_project_archive_fields.sql ==========
-- Unified cinematic library archive fields.
-- video_url / thumbnail_url: 0015. mode / virlo: 0016. storyboard: quick-cut scene archive mirror.

alter table public.cinematic_projects
  add column if not exists storyboard jsonb;

create index if not exists cinematic_projects_user_status_idx
  on public.cinematic_projects (user_id, status, updated_at desc);

-- ========== 0018_cinematic_phase2_fields.sql ==========
-- Phase 2 Quick Cut: language lock, transcript, variation history, Virlo script/style.

alter table public.cinematic_projects
  add column if not exists language text,
  add column if not exists input_type text,
  add column if not exists original_transcript text,
  add column if not exists variation_history jsonb,
  add column if not exists visual_style jsonb,
  add column if not exists viral_script jsonb;

-- ========== 0019_generation_recovery.sql ==========
-- Pipeline recovery: resume after failed generation steps.

alter table public.cinematic_projects
  add column if not exists generation_status text,
  add column if not exists generation_step text,
  add column if not exists generation_error text,
  add column if not exists last_completed_step text;

-- ========== 0021_script_beats.sql ==========
-- Reel-native script beats (canonical cinematic data model).

alter table public.cinematic_projects
  add column if not exists script_beats jsonb;

comment on column public.cinematic_projects.script_beats is
  'Reel-native script: { beats: [{narration,duration,emotion}], payoff?, cta? }';

-- ========== VERIFICATION (one-click — run after migrations above) ==========
-- Expect a single row: migration_status = 'OK: cinematic_projects ready for Quick Cut save'
select
  case
    when not exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'cinematic_projects'
    ) then 'FAIL: cinematic_projects table missing — re-run the 0014 block above'
    when (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cinematic_projects'
        and column_name in (
          'video_url',
          'thumbnail_url',
          'mode',
          'virlo',
          'storyboard',
          'language',
          'input_type',
          'original_transcript',
          'variation_history',
          'visual_style',
          'viral_script',
          'generation_status',
          'generation_step',
          'generation_error',
          'last_completed_step',
          'script_beats'
        )
    ) < 16
      then 'FAIL: missing columns from 0015–0021 — re-run the 0015–0021 blocks above'
    when (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'cinematic_projects'
    ) < 4
      then 'WARN: RLS policies incomplete — re-run the 0014 policy block above'
    else 'OK: cinematic_projects ready for Quick Cut save'
  end as migration_status;

-- ========== 0020_creator_validation.sql ==========
-- Creator feedback, creator metrics, funnel views (analytics_events uses column "event").

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'analytics_events'
  ) then
    raise exception
      '0020_creator_validation: public.analytics_events does not exist. Run the analytics_events migration first.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'event'
  ) then
    raise exception
      '0020_creator_validation: analytics_events.event column missing. Deployed schema must use column "event" (not event_type/event_name).';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'user_id'
  ) then
    raise exception
      '0020_creator_validation: analytics_events.user_id column missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'created_at'
  ) then
    raise exception
      '0020_creator_validation: analytics_events.created_at column missing.';
  end if;
end $$;

create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create table if not exists public.creator_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.cinematic_projects(id) on delete set null,
  rating        text not null check (rating in ('excellent', 'good', 'average', 'weak')),
  feedback_text text,
  created_at    timestamptz not null default now()
);

create index if not exists creator_feedback_user_idx
  on public.creator_feedback (user_id, created_at desc);

create index if not exists creator_feedback_rating_idx
  on public.creator_feedback (rating, created_at desc);

alter table public.creator_feedback enable row level security;

drop policy if exists creator_feedback_insert on public.creator_feedback;
create policy creator_feedback_insert on public.creator_feedback
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists creator_feedback_select_self on public.creator_feedback;
create policy creator_feedback_select_self on public.creator_feedback
  for select to authenticated using (auth.uid() = user_id);

create table if not exists public.creator_metrics (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  trust_score  smallint not null default 50 check (trust_score >= 0 and trust_score <= 100),
  aggregates   jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.creator_metrics enable row level security;

drop policy if exists creator_metrics_select_self on public.creator_metrics;
create policy creator_metrics_select_self on public.creator_metrics
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists creator_metrics_upsert_self on public.creator_metrics;
create policy creator_metrics_upsert_self on public.creator_metrics
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists creator_metrics_update_self on public.creator_metrics;
create policy creator_metrics_update_self on public.creator_metrics
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.creator_funnel_daily as
select
  date_trunc('day', e.created_at)::date as day,
  count(*) filter (where e.event in ('homepage_visit', 'visitor_opened_site')) as landing_events,
  count(distinct e.user_id) filter (where e.event = 'signup_completed' and e.user_id is not null) as signups,
  count(distinct e.user_id) filter (where e.event = 'project_created' and e.user_id is not null) as first_projects,
  count(distinct e.user_id) filter (where e.event = 'generation_completed' and e.user_id is not null) as generations_done,
  count(distinct e.user_id) filter (where e.event = 'storyboard_viewed' and e.user_id is not null) as storyboard_viewers,
  count(distinct e.user_id) filter (where e.event = 'export_completed' and e.user_id is not null) as exporters
from public.analytics_events e
group by 1
order by 1 desc;

create or replace view public.creator_funnel_snapshot as
with users as (
  select distinct user_id from public.analytics_events where user_id is not null
),
steps as (
  select
    u.user_id,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id
        and e.event in ('homepage_visit', 'visitor_opened_site')
    ) as did_land,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id and e.event = 'signup_completed'
    ) as did_signup,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id and e.event = 'project_created'
    ) as did_project,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id and e.event = 'generation_completed'
    ) as did_generate,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id and e.event = 'storyboard_viewed'
    ) as did_storyboard,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id and e.event = 'export_completed'
    ) as did_export,
    exists (
      select 1 from public.analytics_events e
      where e.user_id = u.user_id
        and e.event in ('generation_started', 'homepage_visit', 'visitor_opened_site')
        and e.created_at > (
          select max(e2.created_at) from public.analytics_events e2
          where e2.user_id = u.user_id and e2.event = 'export_completed'
        )
    ) as did_return
  from users u
)
select
  count(*)::int as total_creators,
  count(*) filter (where did_land)::int as landed,
  count(*) filter (where did_signup)::int as signed_up,
  count(*) filter (where did_project)::int as created_project,
  count(*) filter (where did_generate)::int as first_generation,
  count(*) filter (where did_storyboard)::int as viewed_storyboard,
  count(*) filter (where did_export)::int as exported,
  count(*) filter (where did_return)::int as returned_after_export
from steps;

comment on view public.creator_funnel_daily is 'Daily funnel stage counts for creator validation admin.';
comment on view public.creator_funnel_snapshot is 'Per-creator funnel flags aggregated for conversion / dropoff metrics.';

