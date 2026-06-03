-- MugteeOS Phase 6 — Business Operating System (apply after 0054_ecosystem_platform.sql)

-- ============ BUSINESS TWIN ============
create table if not exists public.business_twins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  workspace_id  uuid references public.ecosystem_workspaces(id) on delete set null,
  display_name  text not null default 'My Business',
  model         jsonb not null default '{}'::jsonb,
  metrics       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, brand_id)
);

create index if not exists business_twins_user_idx on public.business_twins (user_id);

alter table public.business_twins enable row level security;

drop policy if exists "business_twins self all" on public.business_twins;
create policy "business_twins self all"
  on public.business_twins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ GOALS ============
create table if not exists public.business_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  brand_id        uuid references public.brand_profiles(id) on delete set null,
  metric_type     text not null check (
    metric_type in ('followers', 'clients', 'revenue_inr', 'reservations')
  ),
  title           text not null,
  target_value    numeric not null default 0,
  current_value   numeric not null default 0,
  milestones      jsonb not null default '[]'::jsonb,
  status          text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  deadline        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists business_goals_user_status_idx
  on public.business_goals (user_id, status);

alter table public.business_goals enable row level security;

drop policy if exists "business_goals self all" on public.business_goals;
create policy "business_goals self all"
  on public.business_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ AUDIENCE SEGMENTS ============
create table if not exists public.audience_segments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  brand_id        uuid references public.brand_profiles(id) on delete set null,
  name            text not null,
  funnel_stage    text not null default 'awareness' check (
    funnel_stage in ('awareness', 'consideration', 'conversion', 'retention')
  ),
  size_estimate   int not null default 0,
  attributes      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists audience_segments_user_idx on public.audience_segments (user_id);

alter table public.audience_segments enable row level security;

drop policy if exists "audience_segments self all" on public.audience_segments;
create policy "audience_segments self all"
  on public.audience_segments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ LEADS ============
create table if not exists public.business_leads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  brand_id          uuid references public.brand_profiles(id) on delete set null,
  source_content_id uuid references public.creative_assets(id) on delete set null,
  project_id        uuid references public.cinematic_projects(id) on delete set null,
  funnel_stage      text not null default 'awareness' check (
    funnel_stage in ('awareness', 'consideration', 'conversion', 'retention')
  ),
  score             int not null default 0 check (score >= 0 and score <= 100),
  status            text not null default 'new' check (
    status in ('new', 'nurturing', 'qualified', 'won', 'lost')
  ),
  contact           jsonb not null default '{}'::jsonb,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists business_leads_user_status_idx
  on public.business_leads (user_id, status, score desc);

alter table public.business_leads enable row level security;

drop policy if exists "business_leads self all" on public.business_leads;
create policy "business_leads self all"
  on public.business_leads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ BUSINESS REVENUE (distinct from 0031 SaaS validation revenue_events) ============
create table if not exists public.business_revenue_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  lead_id       uuid references public.business_leads(id) on delete set null,
  amount_inr    numeric not null default 0,
  event_type    text not null check (
    event_type in ('sale', 'booking', 'subscription', 'tip', 'other')
  ),
  description   text,
  metadata      jsonb not null default '{}'::jsonb,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists business_revenue_events_user_occurred_idx
  on public.business_revenue_events (user_id, occurred_at desc);

alter table public.business_revenue_events enable row level security;

drop policy if exists "business_revenue_events self all" on public.business_revenue_events;
create policy "business_revenue_events self all"
  on public.business_revenue_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ GROWTH METRICS ============
create table if not exists public.growth_metrics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  metric_key    text not null,
  value         numeric not null default 0,
  period_start  date not null,
  period_end    date not null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (user_id, brand_id, metric_key, period_start, period_end)
);

create index if not exists growth_metrics_user_key_idx
  on public.growth_metrics (user_id, metric_key, period_end desc);

alter table public.growth_metrics enable row level security;

drop policy if exists "growth_metrics self all" on public.growth_metrics;
create policy "growth_metrics self all"
  on public.growth_metrics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ INSIGHTS ============
create table if not exists public.business_insights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  insight_type  text not null check (
    insight_type in ('weekly_report', 'worked', 'failed', 'opportunity', 'decision')
  ),
  week_of       date,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists business_insights_user_week_idx
  on public.business_insights (user_id, week_of desc nulls last);

alter table public.business_insights enable row level security;

drop policy if exists "business_insights self all" on public.business_insights;
create policy "business_insights self all"
  on public.business_insights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ CONTENT OUTCOMES (content → engagement → lead → customer → revenue) ============
create table if not exists public.content_outcomes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  brand_id          uuid references public.brand_profiles(id) on delete set null,
  content_asset_id  uuid references public.creative_assets(id) on delete set null,
  project_id        uuid references public.cinematic_projects(id) on delete set null,
  funnel_stage      text not null default 'awareness' check (
    funnel_stage in ('awareness', 'consideration', 'conversion', 'retention')
  ),
  engagement_score  numeric not null default 0,
  lead_id           uuid references public.business_leads(id) on delete set null,
  revenue_event_id  uuid references public.business_revenue_events(id) on delete set null,
  metadata          jsonb not null default '{}'::jsonb,
  recorded_at       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index if not exists content_outcomes_user_recorded_idx
  on public.content_outcomes (user_id, recorded_at desc);

alter table public.content_outcomes enable row level security;

drop policy if exists "content_outcomes self all" on public.content_outcomes;
create policy "content_outcomes self all"
  on public.content_outcomes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.business_twins is 'MugteeOS Phase 6 — per-user/brand business twin (offers, campaigns, clients snapshot)';
comment on table public.business_revenue_events is 'Creator business revenue in INR — not SaaS pricing validation (revenue_events)';
