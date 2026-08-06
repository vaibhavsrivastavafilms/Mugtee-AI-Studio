-- Mugtee V3 — greenfield production OS schema (Phase 1 foundation)
-- Separate from legacy cinematic_projects. Agent jobs communicate via JSON only.

create table if not exists public.v3_projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null default 'Untitled production',
  prompt           text not null,
  status           text not null default 'draft'
    check (status in ('draft', 'planning', 'producing', 'completed', 'failed')),
  production_plan  jsonb,
  current_stage    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists v3_projects_user_updated_idx
  on public.v3_projects (user_id, updated_at desc);

create table if not exists public.v3_scenes (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.v3_projects(id) on delete cascade,
  number       integer not null,
  script       jsonb not null default '{}'::jsonb,
  storyboard   jsonb not null default '{}'::jsonb,
  duration     numeric(8,2),
  created_at   timestamptz not null default now(),
  unique (project_id, number)
);

create index if not exists v3_scenes_project_idx on public.v3_scenes (project_id, number);

create table if not exists public.v3_characters (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.v3_projects(id) on delete cascade,
  name              text not null,
  appearance_json   jsonb not null default '{}'::jsonb,
  seed              text,
  reference_image   text,
  created_at        timestamptz not null default now()
);

create index if not exists v3_characters_project_idx on public.v3_characters (project_id);

create table if not exists public.v3_assets (
  id            uuid primary key default gen_random_uuid(),
  scene_id      uuid references public.v3_scenes(id) on delete cascade,
  project_id    uuid not null references public.v3_projects(id) on delete cascade,
  image_url     text,
  video_url     text,
  voice_url     text,
  music_url     text,
  captions_url  text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists v3_assets_project_idx on public.v3_assets (project_id);

create table if not exists public.v3_jobs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.v3_projects(id) on delete cascade,
  agent         text not null,
  status        text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input         jsonb,
  output        jsonb,
  error         text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (project_id, agent)
);

create index if not exists v3_jobs_project_agent_idx on public.v3_jobs (project_id, agent);

alter table public.v3_projects enable row level security;
alter table public.v3_scenes enable row level security;
alter table public.v3_characters enable row level security;
alter table public.v3_assets enable row level security;
alter table public.v3_jobs enable row level security;

-- Projects
create policy "v3_projects self read" on public.v3_projects for select using (auth.uid() = user_id);
create policy "v3_projects self insert" on public.v3_projects for insert with check (auth.uid() = user_id);
create policy "v3_projects self update" on public.v3_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "v3_projects self delete" on public.v3_projects for delete using (auth.uid() = user_id);

-- Child tables via project ownership
create policy "v3_scenes via project" on public.v3_scenes for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "v3_characters via project" on public.v3_characters for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "v3_assets via project" on public.v3_assets for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);

create policy "v3_jobs via project" on public.v3_jobs for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);
