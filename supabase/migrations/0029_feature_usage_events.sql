-- Phase 6 — Internal feature usage intelligence (admin-only reads via service role).
-- Idempotent — safe to re-run.

create table if not exists public.feature_usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  feature    text not null,
  project_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists feature_usage_events_feature_created_idx
  on public.feature_usage_events (feature, created_at desc);

create index if not exists feature_usage_events_user_feature_idx
  on public.feature_usage_events (user_id, feature);

alter table public.feature_usage_events enable row level security;

drop policy if exists feature_usage_events_insert on public.feature_usage_events;
create policy feature_usage_events_insert on public.feature_usage_events
  for insert to authenticated
  with check (user_id is not null and auth.uid() = user_id);

comment on table public.feature_usage_events is 'Phase 6 internal feature usage events for admin intelligence.';
