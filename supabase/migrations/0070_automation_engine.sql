-- Mugtee Automation Engine — workflow orchestration (n8n Pro backend, Mugtee-native UI)

-- Marketplace templates (system + community)
create table if not exists public.workflow_templates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  category        text not null,
  title           text not null,
  description     text not null,
  icon            text not null default 'sparkles',
  estimated_runtime_sec integer not null default 120,
  inputs          jsonb not null default '[]'::jsonb,
  outputs         jsonb not null default '[]'::jsonb,
  stages          jsonb not null default '[]'::jsonb,
  agent_ids       text[] not null default '{}',
  is_default      boolean not null default true,
  is_public       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists workflow_templates_category_idx
  on public.workflow_templates (category, sort_order);

-- User-installed workflows (references template or custom)
create table if not exists public.automation_workflows (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  template_id     uuid references public.workflow_templates(id) on delete set null,
  project_id      uuid references public.cinematic_projects(id) on delete set null,
  title           text not null,
  slug            text not null,
  category        text not null,
  description     text,
  icon            text not null default 'sparkles',
  config          jsonb not null default '{}'::jsonb,
  orchestrator_ref text,
  enabled         boolean not null default true,
  installed_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists automation_workflows_user_idx
  on public.automation_workflows (user_id, updated_at desc);

-- Workflow execution runs
create table if not exists public.workflow_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workflow_id     uuid not null references public.automation_workflows(id) on delete cascade,
  project_id      uuid references public.cinematic_projects(id) on delete set null,
  status          text not null default 'queued'
    check (status in ('queued','running','waiting','needs_approval','completed','failed','cancelled')),
  progress        integer not null default 0 check (progress >= 0 and progress <= 100),
  current_stage   text,
  runtime_ms      integer,
  credits_used    numeric(12,4) not null default 0,
  models_used     jsonb not null default '[]'::jsonb,
  orchestrator_execution_id text,
  input           jsonb not null default '{}'::jsonb,
  output          jsonb not null default '{}'::jsonb,
  error           text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists workflow_runs_user_created_idx
  on public.workflow_runs (user_id, created_at desc);
create index if not exists workflow_runs_workflow_idx
  on public.workflow_runs (workflow_id, created_at desc);
create index if not exists workflow_runs_status_idx
  on public.workflow_runs (status) where status in ('queued','running','waiting','needs_approval');

-- Structured execution logs
create table if not exists public.workflow_logs (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.workflow_runs(id) on delete cascade,
  level           text not null default 'info' check (level in ('debug','info','warn','error')),
  stage           text,
  message         text not null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists workflow_logs_run_idx
  on public.workflow_logs (run_id, created_at asc);

-- Version history for workflow definitions
create table if not exists public.workflow_versions (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.automation_workflows(id) on delete cascade,
  version         integer not null,
  definition      jsonb not null default '{}'::jsonb,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (workflow_id, version)
);

-- Extended brand memory for automation context
create table if not exists public.brand_memory (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  brand_name      text,
  mission         text,
  vision          text,
  logo_url        text,
  fonts           jsonb not null default '[]'::jsonb,
  colours         jsonb not null default '[]'::jsonb,
  audience        jsonb not null default '{}'::jsonb,
  products        jsonb not null default '[]'::jsonb,
  services        jsonb not null default '[]'::jsonb,
  competitors     jsonb not null default '[]'::jsonb,
  previous_campaigns jsonb not null default '[]'::jsonb,
  brand_tone      text,
  custom_prompts  jsonb not null default '[]'::jsonb,
  writing_style   text,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists brand_memory_user_idx
  on public.brand_memory (user_id);

-- Per-agent memory slices
create table if not exists public.agent_memory (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  agent_id        text not null,
  context         jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now(),
  unique (user_id, agent_id)
);

-- Async execution queue
create table if not exists public.execution_queue (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  run_id          uuid not null references public.workflow_runs(id) on delete cascade,
  priority        integer not null default 0,
  scheduled_at    timestamptz not null default now(),
  status          text not null default 'pending'
    check (status in ('pending','processing','done','failed','cancelled')),
  attempts        integer not null default 0,
  max_attempts    integer not null default 3,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists execution_queue_pending_idx
  on public.execution_queue (status, scheduled_at) where status = 'pending';

-- User automation preferences
create table if not exists public.automation_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  settings        jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.workflow_templates enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_logs enable row level security;
alter table public.workflow_versions enable row level security;
alter table public.brand_memory enable row level security;
alter table public.agent_memory enable row level security;
alter table public.execution_queue enable row level security;
alter table public.automation_settings enable row level security;

create policy "workflow_templates read public"
  on public.workflow_templates for select to authenticated
  using (is_public = true);

create policy "automation_workflows owner"
  on public.automation_workflows for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workflow_runs owner"
  on public.workflow_runs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workflow_logs via run"
  on public.workflow_logs for all to authenticated
  using (exists (
    select 1 from public.workflow_runs r
    where r.id = run_id and r.user_id = auth.uid()
  ));

create policy "workflow_versions via workflow"
  on public.workflow_versions for all to authenticated
  using (exists (
    select 1 from public.automation_workflows w
    where w.id = workflow_id and w.user_id = auth.uid()
  ));

create policy "brand_memory owner"
  on public.brand_memory for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "agent_memory owner"
  on public.agent_memory for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "execution_queue owner"
  on public.execution_queue for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "automation_settings owner"
  on public.automation_settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
