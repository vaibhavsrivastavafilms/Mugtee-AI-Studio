-- Mugtee V3 Phase 11 — Video Generation Engine



create table if not exists public.v3_scene_videos (

  id                  uuid primary key default gen_random_uuid(),

  project_id          uuid not null references public.v3_projects(id) on delete cascade,

  scene_id            uuid not null references public.v3_scenes(id) on delete cascade,

  image_id            uuid references public.v3_scene_images(id) on delete cascade,

  provider            text not null,

  provider_job_id     text,

  video_url           text,

  thumbnail_url       text,

  duration_seconds    numeric,

  fps                 integer,

  resolution          text,

  generation_time_ms  integer,

  status              text not null default 'pending'

    check (status in ('pending', 'queued', 'generating', 'completed', 'failed', 'cancelled')),

  retry_count         integer not null default 0,

  metadata            jsonb not null default '{}'::jsonb,

  created_at          timestamptz not null default now(),

  updated_at          timestamptz not null default now()

);



create index if not exists v3_scene_videos_project_idx

  on public.v3_scene_videos (project_id);



create index if not exists v3_scene_videos_scene_idx

  on public.v3_scene_videos (scene_id);



create index if not exists v3_scene_videos_status_idx

  on public.v3_scene_videos (status);



create index if not exists v3_scene_videos_scene_created_idx

  on public.v3_scene_videos (scene_id, created_at desc);



alter table public.v3_scene_videos enable row level security;



create policy "v3_scene_videos via project" on public.v3_scene_videos for all using (

  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())

) with check (

  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())

);


