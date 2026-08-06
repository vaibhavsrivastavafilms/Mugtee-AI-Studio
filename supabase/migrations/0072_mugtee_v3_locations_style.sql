-- Mugtee V3 Phase 6–8: locations, cinematic style, scene references

alter table public.v3_projects
  add column if not exists cinematic_style jsonb;

create table if not exists public.v3_locations (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.v3_projects(id) on delete cascade,
  location_key    text not null,
  name            text not null,
  profile         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (project_id, location_key)
);

create index if not exists v3_locations_project_idx on public.v3_locations (project_id);

alter table public.v3_scenes
  add column if not exists location_id uuid references public.v3_locations(id) on delete set null;

alter table public.v3_scenes
  add column if not exists character_ids jsonb not null default '[]'::jsonb;

alter table public.v3_locations enable row level security;

create policy "v3_locations via project" on public.v3_locations for all using (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v3_projects p where p.id = project_id and p.user_id = auth.uid())
);
