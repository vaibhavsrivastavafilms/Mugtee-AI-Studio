-- Hollywood AI Studio — Director Mode multi-stage workspace (owner-only via cinematic_projects RLS join).

create table if not exists public.story_directions (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  topic                 text not null default '',
  options               jsonb not null default '[]'::jsonb,
  selected_id           text,
  active_story_direction jsonb,
  updated_at            timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.director_treatments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.character_bibles (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.camera_profiles (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  camera_language jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.voice_profiles (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.music_profiles (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.motion_plans (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.director_project_state (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.cinematic_projects(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  director_approved boolean not null default false,
  stage_progress    jsonb not null default '{}'::jsonb,
  blueprint_locked  boolean not null default false,
  storyboard_plan   jsonb,
  blueprint         jsonb,
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (project_id)
);

create index if not exists story_directions_user_idx on public.story_directions (user_id, updated_at desc);
create index if not exists director_project_state_user_idx on public.director_project_state (user_id, updated_at desc);

-- RLS: owner via cinematic_projects
alter table public.story_directions enable row level security;
alter table public.director_treatments enable row level security;
alter table public.character_bibles enable row level security;
alter table public.camera_profiles enable row level security;
alter table public.voice_profiles enable row level security;
alter table public.music_profiles enable row level security;
alter table public.motion_plans enable row level security;
alter table public.director_project_state enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'story_directions',
    'director_treatments',
    'character_bibles',
    'camera_profiles',
    'voice_profiles',
    'music_profiles',
    'motion_plans',
    'director_project_state'
  ]
  loop
    execute format('drop policy if exists "%s owner read" on public.%I', t, t);
    execute format(
      'create policy "%s owner read" on public.%I for select using (
        exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
      )', t, t
    );
    execute format('drop policy if exists "%s owner insert" on public.%I', t, t);
    execute format(
      'create policy "%s owner insert" on public.%I for insert with check (
        auth.uid() = user_id and exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
      )', t, t
    );
    execute format('drop policy if exists "%s owner update" on public.%I', t, t);
    execute format(
      'create policy "%s owner update" on public.%I for update using (
        exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
      ) with check (
        auth.uid() = user_id and exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
      )', t, t
    );
    execute format('drop policy if exists "%s owner delete" on public.%I', t, t);
    execute format(
      'create policy "%s owner delete" on public.%I for delete using (
        exists (select 1 from public.cinematic_projects p where p.id = project_id and p.user_id = auth.uid())
      )', t, t
    );
  end loop;
end $$;

comment on table public.story_directions is 'Director Studio — 3 story angle options + active selection per project';
comment on table public.director_project_state is 'Director Studio — approval, stage progress, blueprint lock';
