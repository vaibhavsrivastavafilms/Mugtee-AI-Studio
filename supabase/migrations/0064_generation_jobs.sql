-- Durable Quick Cut generation jobs (cross-device resume, refresh-safe progress).

create table if not exists public.generation_jobs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.cinematic_projects (id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  current_step text,
  last_completed_step text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_jobs_user_id_idx on public.generation_jobs (user_id);
create index if not exists generation_jobs_project_id_idx on public.generation_jobs (project_id);
create index if not exists generation_jobs_status_idx on public.generation_jobs (status);
create index if not exists generation_jobs_project_active_idx
  on public.generation_jobs (project_id, updated_at desc)
  where status in ('queued', 'running', 'paused');

comment on table public.generation_jobs is
  'Durable Quick Cut generation jobs for cross-device resume and refresh-safe progress.';

alter table public.generation_jobs enable row level security;

drop policy if exists "generation_jobs select own" on public.generation_jobs;
create policy "generation_jobs select own"
  on public.generation_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "generation_jobs insert own" on public.generation_jobs;
create policy "generation_jobs insert own"
  on public.generation_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "generation_jobs update own" on public.generation_jobs;
create policy "generation_jobs update own"
  on public.generation_jobs for update
  using (auth.uid() = user_id);
