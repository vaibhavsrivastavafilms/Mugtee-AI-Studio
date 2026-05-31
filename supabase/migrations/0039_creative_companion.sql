-- Mugtee Human Creative Companion System
-- Creative brief + director notes on projects; creator memory on profiles; reflections table.

alter table public.cinematic_projects
  add column if not exists creative_brief jsonb not null default '{}'::jsonb,
  add column if not exists director_notes jsonb not null default '[]'::jsonb,
  add column if not exists director_session_counts jsonb not null default '{}'::jsonb;

comment on column public.cinematic_projects.creative_brief is
  'Discovery brief: theme, emotion, audience_reaction, protagonist, tone, takeaway';
comment on column public.cinematic_projects.director_notes is
  'Array of { id, text, sceneRef?, createdAt, sessionId } — max 3 notes per session enforced in API';
comment on column public.cinematic_projects.director_session_counts is
  'Map sessionId → comment count for 3-per-session cap';

alter table public.creator_profiles
  add column if not exists creator_memory jsonb not null default '{}'::jsonb;

comment on column public.creator_profiles.creator_memory is
  'Companion memory: favoriteNiches, preferredHookStyle, preferredTone, preferredVisualStyle, preferredDuration, commonThemes';

create table if not exists public.creator_reflections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  highlight   text not null check (highlight in ('hook', 'story', 'visuals', 'ending', 'voice')),
  created_at  timestamptz not null default now()
);

create index if not exists creator_reflections_user_idx
  on public.creator_reflections (user_id, created_at desc);
create index if not exists creator_reflections_project_idx
  on public.creator_reflections (project_id);

alter table public.creator_reflections enable row level security;

drop policy if exists "creator_reflections self read" on public.creator_reflections;
create policy "creator_reflections self read"
  on public.creator_reflections for select
  using (auth.uid() = user_id);

drop policy if exists "creator_reflections self insert" on public.creator_reflections;
create policy "creator_reflections self insert"
  on public.creator_reflections for insert
  with check (auth.uid() = user_id);

comment on table public.creator_reflections is
  'Post-export reflection — which part of the reel felt strongest';
