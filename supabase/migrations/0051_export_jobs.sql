-- Durable MP4 export job queue (replaces project-row + ephemeral job-store as source of truth).

create table if not exists public.export_jobs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.cinematic_projects (id) on delete set null,
  status text not null default 'queued'
    check (status in ('pending', 'queued', 'rendering', 'uploading', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  render_url text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists export_jobs_user_id_idx on public.export_jobs (user_id);
create index if not exists export_jobs_project_id_idx on public.export_jobs (project_id);
create index if not exists export_jobs_status_idx on public.export_jobs (status);
create index if not exists export_jobs_project_active_idx
  on public.export_jobs (project_id, updated_at desc)
  where status in ('pending', 'queued', 'rendering', 'uploading');

comment on table public.export_jobs is
  'Durable reel/MP4 export jobs. storage paths live in metadata; render_url is public URL at completion only.';

alter table public.export_jobs enable row level security;

drop policy if exists "export_jobs select own" on public.export_jobs;
create policy "export_jobs select own"
  on public.export_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "export_jobs insert own" on public.export_jobs;
create policy "export_jobs insert own"
  on public.export_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "export_jobs update own" on public.export_jobs;
create policy "export_jobs update own"
  on public.export_jobs for update
  using (auth.uid() = user_id);
