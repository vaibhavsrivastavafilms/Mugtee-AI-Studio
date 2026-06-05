-- Director Mode V3 — Story Framework selection + virlo-ready score columns.

create table if not exists public.story_frameworks (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  framework_name      text not null,
  core_emotion        text not null default '',
  audience_desire     text not null default '',
  narrative_tension   text not null default '',
  curiosity_gap       text not null default '',
  transformation      text not null default '',
  confidence_score    integer not null default 0,
  virality_score      integer,
  retention_score     integer,
  shareability_score  integer,
  saveability_score   integer,
  is_active           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists story_frameworks_project_idx on public.story_frameworks (project_id, updated_at desc);
create index if not exists story_frameworks_user_idx on public.story_frameworks (user_id, updated_at desc);

alter table public.director_project_state
  add column if not exists story_director_package jsonb,
  add column if not exists framework_recommendations jsonb not null default '[]'::jsonb,
  add column if not exists active_framework_id uuid references public.story_frameworks(id) on delete set null,
  add column if not exists framework_analysis jsonb;

alter table public.story_frameworks enable row level security;

do $$
begin
  execute 'drop policy if exists "story_frameworks owner read" on public.story_frameworks';
  execute 'create policy "story_frameworks owner read" on public.story_frameworks for select using (
    exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
  )';
  execute 'drop policy if exists "story_frameworks owner insert" on public.story_frameworks';
  execute 'create policy "story_frameworks owner insert" on public.story_frameworks for insert with check (
    auth.uid() = user_id and exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
  )';
  execute 'drop policy if exists "story_frameworks owner update" on public.story_frameworks';
  execute 'create policy "story_frameworks owner update" on public.story_frameworks for update using (
    exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    auth.uid() = user_id and exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
  )';
  execute 'drop policy if exists "story_frameworks owner delete" on public.story_frameworks';
  execute 'create policy "story_frameworks owner delete" on public.story_frameworks for delete using (
    exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
  )';
end $$;

comment on table public.story_frameworks is 'Director Studio V3 — narrative framework recommendations and active selection per project';
