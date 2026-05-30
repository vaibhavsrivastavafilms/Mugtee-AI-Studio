-- Consolidated cinematic_projects migrations (0014-0017)
-- Run once in Supabase Dashboard -> SQL Editor -> New query
-- Idempotent: safe to re-run (IF NOT EXISTS / drop policy if exists)
-- ========== 0014_cinematic_projects.sql ==========
-- MUGTEE â€” Lightweight cinematic creator project persistence.
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

-- ========== 0015_project_video_urls.sql ==========
-- Faceless render outputs on cinematic_projects
alter table public.cinematic_projects
  add column if not exists video_url text,
  add column if not exists thumbnail_url text;

-- ========== 0016_unified_projects.sql ==========
-- Unified creator OS â€” mode + Virlo metadata on cinematic_projects.
-- video_url / thumbnail_url already added in 0015.

alter table public.cinematic_projects
  add column if not exists mode text not null default 'director',
  add column if not exists virlo jsonb;

create index if not exists cinematic_projects_user_mode_idx
  on public.cinematic_projects (user_id, mode, updated_at desc);

-- ========== 0017_project_archive_fields.sql ==========
-- Unified cinematic library archive fields.
-- video_url / thumbnail_url: 0015. mode / virlo: 0016. storyboard: quick-cut scene archive mirror.

alter table public.cinematic_projects
  add column if not exists storyboard jsonb;

create index if not exists cinematic_projects_user_status_idx
  on public.cinematic_projects (user_id, status, updated_at desc);

-- ========== VERIFICATION (one-click — run after migrations above) ==========
-- Expect a single row: migration_status = 'OK: cinematic_projects ready for Quick Cut save'
select
  case
    when not exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'cinematic_projects'
    ) then 'FAIL: cinematic_projects table missing — re-run the 0014 block above'
    when (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cinematic_projects'
        and column_name in (
          'video_url',
          'thumbnail_url',
          'mode',
          'virlo',
          'storyboard'
        )
    ) < 5
      then 'FAIL: missing columns from 0015–0017 — re-run the 0015–0017 blocks above'
    when (
      select count(*)
      from pg_policies
      where schemaname = 'public'
        and tablename = 'cinematic_projects'
    ) < 4
      then 'WARN: RLS policies incomplete — re-run the 0014 policy block above'
    else 'OK: cinematic_projects ready for Quick Cut save'
  end as migration_status;

