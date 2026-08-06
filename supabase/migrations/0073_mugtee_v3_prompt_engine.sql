-- Mugtee V3 Phase 9 — Prompt Engineering Engine

create table if not exists public.v3_scene_prompts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.v3_projects(id) on delete cascade,
  scene_id        uuid not null references public.v3_scenes(id) on delete cascade,
  image_prompt    text not null,
  video_prompt    text not null,
  negative_prompt text not null,
  prompt_version  integer not null default 1,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (scene_id, prompt_version)
);

create index if not exists v3_scene_prompts_project_idx
  on public.v3_scene_prompts (project_id);

create index if not exists v3_scene_prompts_scene_idx
  on public.v3_scene_prompts (scene_id);

alter table public.v3_scene_prompts enable row level security;

create policy "v3_scene_prompts via project" on public.v3_scene_prompts for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);
