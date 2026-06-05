-- AI Producer System (Mugtee V5) — executive producer review before production

create table if not exists public.producer_reports (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  story_score             int not null default 0 check (story_score between 0 and 100),
  audience_score          int not null default 0 check (audience_score between 0 and 100),
  emotion_score           int not null default 0 check (emotion_score between 0 and 100),
  visual_score            int not null default 0 check (visual_score between 0 and 100),
  retention_score         int not null default 0 check (retention_score between 0 and 100),
  shareability_score      int not null default 0 check (shareability_score between 0 and 100),
  cinematic_score         int not null default 0 check (cinematic_score between 0 and 100),
  curiosity_score         int not null default 0 check (curiosity_score between 0 and 100),
  story_readiness_score   int not null default 0 check (story_readiness_score between 0 and 100),
  production_ready        boolean not null default false,
  recommendations         jsonb not null default '{}'::jsonb,
  producer_memory         jsonb not null default '{"acceptedSuggestionIds":[],"rejectedSuggestionIds":[]}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (project_id)
);

create index if not exists producer_reports_project_idx
  on public.producer_reports (project_id);

create index if not exists producer_reports_user_idx
  on public.producer_reports (user_id);

alter table public.producer_reports enable row level security;

drop policy if exists "producer_reports self all" on public.producer_reports;
create policy "producer_reports self all"
  on public.producer_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Track user approval of producer review in director project state
alter table public.director_project_state
  add column if not exists producer_approved boolean not null default false;

-- Aggregate producer feedback into creator memories
alter table public.creator_memories
  add column if not exists producer_memory jsonb not null default '{"acceptedSuggestionIds":[],"rejectedSuggestionIds":[]}'::jsonb;

comment on table public.producer_reports is
  'AI Producer executive review — strategic feedback on creative decisions before production (Director Mode V5)';
