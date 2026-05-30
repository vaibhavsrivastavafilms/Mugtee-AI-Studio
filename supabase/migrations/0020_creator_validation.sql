-- Phase 1.6 — Creator validation infrastructure (analytics, feedback, metrics, funnel views)
-- Idempotent — safe to re-run.
-- Assumes analytics_events schema: id, created_at, user_id, session_id, event, page, metadata

-- Schema validation (fail fast with a helpful message)
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

-- Funnel query indexes (user-level aggregation; no project_id on analytics_events)
create index if not exists analytics_events_event_created_idx
  on public.analytics_events (event, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

-- Users may only attach their own user_id on insert
drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Post-export quality feedback
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
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists creator_feedback_select_self on public.creator_feedback;
create policy creator_feedback_select_self on public.creator_feedback
  for select to authenticated
  using (auth.uid() = user_id);

-- Per-creator trust score + aggregates (updated by app on feedback / read path)
create table if not exists public.creator_metrics (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  trust_score  smallint not null default 50 check (trust_score >= 0 and trust_score <= 100),
  aggregates   jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.creator_metrics enable row level security;

drop policy if exists creator_metrics_select_self on public.creator_metrics;
create policy creator_metrics_select_self on public.creator_metrics
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists creator_metrics_upsert_self on public.creator_metrics;
create policy creator_metrics_upsert_self on public.creator_metrics
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists creator_metrics_update_self on public.creator_metrics;
create policy creator_metrics_update_self on public.creator_metrics
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Funnel: daily event counts for admin SQL dashboards (user-level; column = event)
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

-- Funnel conversion snapshot (all-time rolling; filter in API by created_at)
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
