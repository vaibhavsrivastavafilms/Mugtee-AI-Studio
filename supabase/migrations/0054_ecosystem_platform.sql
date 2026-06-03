-- MugteeOS Phase 5 — Ecosystem platform (integrations, marketplace, workspaces, publish, automation)
-- Apply after 0053_creative_assets.sql (and any 0052_* migrations in your environment).

-- ============ TEAM WORKSPACES ============
create table if not exists public.ecosystem_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ecosystem_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ecosystem_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists ecosystem_workspace_members_user_idx
  on public.ecosystem_workspace_members (user_id);

-- ============ USER INTEGRATIONS ============
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.ecosystem_workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'pending')),
  tokens_encrypted jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_health_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_integrations_user_provider_idx
  on public.user_integrations (user_id, provider);

-- ============ MARKETPLACE ============
create table if not exists public.marketplace_agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text not null default 'general',
  pricing_model text not null default 'free' check (pricing_model in ('free', 'paid', 'subscription')),
  price_cents int not null default 0,
  revenue_share_percent numeric(5,2) not null default 0,
  manifest jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_installs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.ecosystem_workspaces(id) on delete set null,
  agent_slug text not null references public.marketplace_agents(slug) on delete cascade,
  status text not null default 'active' check (status in ('active', 'disabled', 'uninstalled')),
  installed_at timestamptz not null default now(),
  unique (user_id, agent_slug)
);

create table if not exists public.agent_permissions (
  id uuid primary key default gen_random_uuid(),
  install_id uuid not null references public.agent_installs(id) on delete cascade,
  permission text not null,
  granted boolean not null default false,
  unique (install_id, permission)
);

create table if not exists public.agent_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null references public.marketplace_agents(slug) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamptz not null default now(),
  unique (user_id, agent_slug)
);

-- ============ PUBLISH SCHEDULES ============
create table if not exists public.publish_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.ecosystem_workspaces(id) on delete set null,
  platform text not null,
  content_ref jsonb not null default '{}'::jsonb,
  caption text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'published', 'failed', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publish_schedules_user_scheduled_idx
  on public.publish_schedules (user_id, scheduled_at);

-- ============ AUTOMATION ============
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.ecosystem_workspaces(id) on delete cascade,
  name text not null,
  trigger_event text not null,
  condition jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  secret text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed marketplace agents
insert into public.marketplace_agents (slug, name, description, category, pricing_model, manifest)
values
  ('restaurant-agent', 'Restaurant Agent', 'Menus, promos, and local reel campaigns for restaurants.', 'hospitality', 'free', '{"tools":["generateScript","generateCaption"]}'::jsonb),
  ('brand-strategist', 'Brand Strategist', 'Campaign angles aligned with creator memory.', 'strategy', 'free', '{"tools":["searchMemory","generateCalendar"]}'::jsonb),
  ('publish-coordinator', 'Publish Coordinator', 'Schedule and caption across social platforms.', 'publishing', 'subscription', '{"tools":["schedulePublish","connectIntegration"]}'::jsonb)
on conflict (slug) do nothing;

-- ============ RLS ============
alter table public.ecosystem_workspaces enable row level security;
alter table public.ecosystem_workspace_members enable row level security;
alter table public.user_integrations enable row level security;
alter table public.marketplace_agents enable row level security;
alter table public.agent_installs enable row level security;
alter table public.agent_permissions enable row level security;
alter table public.agent_ratings enable row level security;
alter table public.publish_schedules enable row level security;
alter table public.automation_rules enable row level security;
alter table public.webhook_subscriptions enable row level security;

-- Workspaces: owner or member
do $$ begin
  begin create policy "ecosystem_ws_select" on public.ecosystem_workspaces for select to authenticated
    using (
      owner_id = auth.uid()
      or exists (
        select 1 from public.ecosystem_workspace_members m
        where m.workspace_id = id and m.user_id = auth.uid()
      )
    ); exception when duplicate_object then null; end;
  begin create policy "ecosystem_ws_insert" on public.ecosystem_workspaces for insert to authenticated
    with check (owner_id = auth.uid()); exception when duplicate_object then null; end;
  begin create policy "ecosystem_ws_update" on public.ecosystem_workspaces for update to authenticated
    using (owner_id = auth.uid()) with check (owner_id = auth.uid()); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "ecosystem_ws_members_select" on public.ecosystem_workspace_members for select to authenticated
    using (
      user_id = auth.uid()
      or exists (
        select 1 from public.ecosystem_workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    ); exception when duplicate_object then null; end;
  begin create policy "ecosystem_ws_members_insert" on public.ecosystem_workspace_members for insert to authenticated
    with check (
      exists (
        select 1 from public.ecosystem_workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    ); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "user_integrations_owner" on public.user_integrations for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "marketplace_agents_read" on public.marketplace_agents for select to authenticated
    using (is_published = true); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "agent_installs_owner" on public.agent_installs for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "agent_permissions_via_install" on public.agent_permissions for all to authenticated
    using (
      exists (
        select 1 from public.agent_installs i
        where i.id = install_id and i.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.agent_installs i
        where i.id = install_id and i.user_id = auth.uid()
      )
    ); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "agent_ratings_owner" on public.agent_ratings for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "publish_schedules_owner" on public.publish_schedules for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "automation_rules_owner" on public.automation_rules for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;

do $$ begin
  begin create policy "webhook_subscriptions_owner" on public.webhook_subscriptions for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid()); exception when duplicate_object then null; end;
end $$;
