-- Mugtee V3 Phase 10 — Image Generation Engine

create table if not exists public.v3_scene_images (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.v3_projects(id) on delete cascade,
  scene_id            uuid not null references public.v3_scenes(id) on delete cascade,
  prompt_id           uuid references public.v3_scene_prompts(id) on delete set null,
  provider            text not null,
  provider_job_id     text,
  image_url           text,
  thumbnail_url       text,
  seed                integer,
  width               integer,
  height              integer,
  generation_time_ms  integer,
  status              text not null default 'pending'
    check (status in ('pending', 'queued', 'generating', 'completed', 'failed', 'cancelled')),
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists v3_scene_images_project_idx
  on public.v3_scene_images (project_id);

create index if not exists v3_scene_images_scene_idx
  on public.v3_scene_images (scene_id);

create index if not exists v3_scene_images_status_idx
  on public.v3_scene_images (status);

create index if not exists v3_scene_images_scene_created_idx
  on public.v3_scene_images (scene_id, created_at desc);

alter table public.v3_scene_images enable row level security;

create policy "v3_scene_images via project" on public.v3_scene_images for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);
