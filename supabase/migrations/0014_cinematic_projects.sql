-- MUGTEE — Lightweight cinematic creator project persistence.
-- Single table, no over-normalization. Owner-only via RLS.

create table if not exists public.cinematic_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled project',
  prompt      text not null default '',
  style       text not null default 'cinematic',
  duration    integer not null default 60,
  script      text not null default '',
  scenes      jsonb not null default '[]'::jsonb,
  voice       jsonb,
  captions    jsonb not null default '{"text":""}'::jsonb,
  status      text not null default 'create',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists cinematic_projects_user_updated_idx
  on public.cinematic_projects (user_id, updated_at desc);

alter table public.cinematic_projects enable row level security;

drop policy if exists "cinematic_projects self read" on public.cinematic_projects;
create policy "cinematic_projects self read"
  on public.cinematic_projects for select
  using (auth.uid() = user_id);

drop policy if exists "cinematic_projects self insert" on public.cinematic_projects;
create policy "cinematic_projects self insert"
  on public.cinematic_projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "cinematic_projects self update" on public.cinematic_projects;
create policy "cinematic_projects self update"
  on public.cinematic_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cinematic_projects self delete" on public.cinematic_projects;
create policy "cinematic_projects self delete"
  on public.cinematic_projects for delete
  using (auth.uid() = user_id);
