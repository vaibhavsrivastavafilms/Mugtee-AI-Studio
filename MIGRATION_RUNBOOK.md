# Supabase migration runbook

Apply migrations **in numeric order** in the Supabase SQL editor (Dashboard → SQL → New query).

## Migration inventory (`supabase/migrations/`)

| File | Purpose |
|------|---------|
| `0001_init.sql` | `content_pieces`, `crew`, `shoots`, `media`, `team_activity` + RLS |
| `0002_storage.sql` | Storage buckets/policies |
| `0003_workspaces.sql` | `workspaces` |
| `0004_archive_themes.sql` | Soft-delete / archive columns |
| `0005_automation.sql` | `notifications`, `publishing_queue`, `recurring_workflows` |
| `0006_ai.sql` | AI-related columns |
| `0007_scheduling.sql` | Scheduling columns |
| `0008_instagram.sql` | `instagram_accounts` |
| `0009_sponsor_clicks.sql` | `sponsor_clicks` |
| `0010_profile_trial.sql` | `profiles` + trial RLS |
| `0011_project_assets.sql` | `project_assets` |
| `0012_activity_memory.sql` | Activity memory columns |
| `0013_analytics_events.sql` | `analytics_events` |
| **`0014_cinematic_projects.sql`** | **`cinematic_projects` base table + RLS** |
| **`0015_project_video_urls.sql`** | `video_url`, `thumbnail_url` |
| **`0016_unified_projects.sql`** | `mode`, `virlo` + index |
| **`0017_project_archive_fields.sql`** | `storyboard` + status index |

## Root-level one-offs (`migrations/`)

| File | Purpose |
|------|---------|
| `migrations/0001_billing.sql` | `subscriptions` |
| `migrations/0002_youtube.sql` | `youtube_accounts` + YouTube columns on `content_pieces` |

## Symptom: `[cinematic_projects] Table missing` / 404 on project save

Production is missing **0014–0017**. Run the consolidated block below once (idempotent).

## Symptom: billing or YouTube errors

Run `migrations/0001_billing.sql` and `migrations/0002_youtube.sql` if not already applied.

## Legacy note: `projects` table

`lib/projects.ts` and `/api/projects/*` reference a legacy `projects` table with **no migration in this repo**. The unified creator library uses **`cinematic_projects`** (0014+). Prefer `/create` and `cinematic_projects` for new work.

## Consolidated SQL — cinematic_projects (0014–0017)

Copy into Supabase SQL editor and run once:

```sql
-- 0014 — base table
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
  on public.cinematic_projects for select using (auth.uid() = user_id);

drop policy if exists "cinematic_projects self insert" on public.cinematic_projects;
create policy "cinematic_projects self insert"
  on public.cinematic_projects for insert with check (auth.uid() = user_id);

drop policy if exists "cinematic_projects self update" on public.cinematic_projects;
create policy "cinematic_projects self update"
  on public.cinematic_projects for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cinematic_projects self delete" on public.cinematic_projects;
create policy "cinematic_projects self delete"
  on public.cinematic_projects for delete using (auth.uid() = user_id);

-- 0015 — render outputs
alter table public.cinematic_projects
  add column if not exists video_url text,
  add column if not exists thumbnail_url text;

-- 0016 — unified creator metadata
alter table public.cinematic_projects
  add column if not exists mode text not null default 'director',
  add column if not exists virlo jsonb;

create index if not exists cinematic_projects_user_mode_idx
  on public.cinematic_projects (user_id, mode, updated_at desc);

-- 0017 — archive mirror + status index
alter table public.cinematic_projects
  add column if not exists storyboard jsonb;

create index if not exists cinematic_projects_user_status_idx
  on public.cinematic_projects (user_id, status, updated_at desc);
```

After running, reload the app. Recent projects and Quick Cut auto-save should work without a full redeploy.
