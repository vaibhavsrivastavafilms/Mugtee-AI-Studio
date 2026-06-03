-- MugteeOS Phase 2 — durable autonomous agent workflow state

create table if not exists public.agent_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal text not null,
  mode text not null default 'autonomous'
    check (mode in ('autonomous', 'manual')),
  status text not null default 'pending'
    check (status in ('pending', 'planning', 'executing', 'completed', 'failed', 'cancelled')),
  plan jsonb,
  task_graph jsonb not null default '[]'::jsonb,
  agent_messages jsonb not null default '[]'::jsonb,
  package jsonb,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_workflows_user_id_idx on public.agent_workflows (user_id);
create index if not exists agent_workflows_status_idx on public.agent_workflows (status);
create index if not exists agent_workflows_user_updated_idx
  on public.agent_workflows (user_id, updated_at desc);

comment on table public.agent_workflows is
  'MugteeOS autonomous agent executions: plan, DAG tasks, agent messages, assembled package.';

alter table public.agent_workflows enable row level security;

drop policy if exists "agent_workflows select own" on public.agent_workflows;
create policy "agent_workflows select own"
  on public.agent_workflows for select
  using (auth.uid() = user_id);

drop policy if exists "agent_workflows insert own" on public.agent_workflows;
create policy "agent_workflows insert own"
  on public.agent_workflows for insert
  with check (auth.uid() = user_id);

drop policy if exists "agent_workflows update own" on public.agent_workflows;
create policy "agent_workflows update own"
  on public.agent_workflows for update
  using (auth.uid() = user_id);
