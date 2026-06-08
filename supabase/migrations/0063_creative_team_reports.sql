-- AI Creative Team (Mugtee V8) — orchestrated specialist reports for Director Mode

create table if not exists public.creative_team_reports (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  story_strategy        jsonb,
  producer_report       jsonb,
  screenwriter_report   jsonb,
  cinematography_report jsonb,
  voice_report          jsonb,
  music_report          jsonb,
  alignment_score       jsonb,
  agent_states          jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (project_id)
);

create index if not exists creative_team_reports_project_idx
  on public.creative_team_reports (project_id);

create index if not exists creative_team_reports_user_idx
  on public.creative_team_reports (user_id);

alter table public.creative_team_reports enable row level security;

drop policy if exists "creative_team_reports self all" on public.creative_team_reports;
create policy "creative_team_reports self all"
  on public.creative_team_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.creative_team_reports is
  'AI Creative Team orchestration — six specialist agent reports + alignment score (Director Mode V8)';
