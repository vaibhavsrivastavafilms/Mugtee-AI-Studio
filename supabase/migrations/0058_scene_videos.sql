-- Director Mode — per-scene image-to-video jobs (owner-only via cinematic_projects RLS join).

create table if not exists public.scene_videos (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.cinematic_projects(id) on delete cascade,
  scene_id          text not null,
  user_id           uuid not null references auth.users(id) on delete cascade,
  provider          text not null default 'replicate',
  status            text not null default 'queued'
    check (status in ('queued', 'generating', 'completed', 'failed')),
  video_url         text,
  error_message     text,
  motion_plan       jsonb,
  source_image_url  text,
  provider_job_id   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, scene_id)
);

create index if not exists scene_videos_project_idx on public.scene_videos (project_id, updated_at desc);
create index if not exists scene_videos_user_idx on public.scene_videos (user_id, updated_at desc);

alter table public.scene_videos enable row level security;

drop policy if exists "scene_videos owner read" on public.scene_videos;
create policy "scene_videos owner read" on public.scene_videos for select using (
  exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists "scene_videos owner insert" on public.scene_videos;
create policy "scene_videos owner insert" on public.scene_videos for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists "scene_videos owner update" on public.scene_videos;
create policy "scene_videos owner update" on public.scene_videos for update using (
  exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  auth.uid() = user_id
  and exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
);

drop policy if exists "scene_videos owner delete" on public.scene_videos;
create policy "scene_videos owner delete" on public.scene_videos for delete using (
  exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
);

comment on table public.scene_videos is 'Director Mode — image-to-video scene clips per project scene';
