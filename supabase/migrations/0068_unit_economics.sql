-- Unit economics: research cache + export job cost tracking

create table if not exists public.project_research_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.cinematic_projects (id) on delete cascade,
  research_text text not null default '',
  topic_hash text not null,
  report_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_research_cache_user_topic_idx
  on public.project_research_cache (user_id, topic_hash);

comment on table public.project_research_cache is
  'Per-topic deep research cache — avoids repeat Perplexity spend on regen.';

alter table public.project_research_cache enable row level security;

drop policy if exists "project_research_cache select own" on public.project_research_cache;
create policy "project_research_cache select own"
  on public.project_research_cache for select
  using (auth.uid() = user_id);

drop policy if exists "project_research_cache insert own" on public.project_research_cache;
create policy "project_research_cache insert own"
  on public.project_research_cache for insert
  with check (auth.uid() = user_id);

drop policy if exists "project_research_cache update own" on public.project_research_cache;
create policy "project_research_cache update own"
  on public.project_research_cache for update
  using (auth.uid() = user_id);

-- Export job economics columns
alter table public.export_jobs
  add column if not exists retry_count integer not null default 0;

alter table public.export_jobs
  add column if not exists cost_estimate_usd numeric(10, 4);

alter table public.export_jobs
  add column if not exists render_seconds numeric(10, 2);

comment on column public.export_jobs.retry_count is 'Render retry attempts — capped at MAX_RENDER_RETRIES in app.';
comment on column public.export_jobs.cost_estimate_usd is 'Estimated Vercel Remotion compute cost (USD).';
comment on column public.export_jobs.render_seconds is 'Wall-clock render duration for cost tracking.';
