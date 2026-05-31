-- Mugtee V4 Autonomous Creator Agent — opportunity feed, ideas, weekly plan, competitors, agent missions.

create table if not exists public.creator_opportunities (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  type                text not null default 'high_opportunity'
    check (type in ('high_opportunity', 'emerging_trend', 'underserved_niche', 'low_competition')),
  description         text,
  opportunity_score   int not null default 50 check (opportunity_score between 0 and 100),
  competition_score   int not null default 50 check (competition_score between 0 and 100),
  viral_potential     int not null default 50 check (viral_potential between 0 and 100),
  payload             jsonb not null default '{}'::jsonb,
  feed_date           date not null default (current_date),
  created_at          timestamptz not null default now()
);

create index if not exists creator_opportunities_user_feed_idx
  on public.creator_opportunities (user_id, feed_date desc, created_at desc);

alter table public.creator_opportunities enable row level security;

drop policy if exists "creator_opportunities self read" on public.creator_opportunities;
create policy "creator_opportunities self read"
  on public.creator_opportunities for select
  using (auth.uid() = user_id);

drop policy if exists "creator_opportunities self insert" on public.creator_opportunities;
create policy "creator_opportunities self insert"
  on public.creator_opportunities for insert
  with check (auth.uid() = user_id);

drop policy if exists "creator_opportunities self update" on public.creator_opportunities;
create policy "creator_opportunities self update"
  on public.creator_opportunities for update
  using (auth.uid() = user_id);

drop policy if exists "creator_opportunities self delete" on public.creator_opportunities;
create policy "creator_opportunities self delete"
  on public.creator_opportunities for delete
  using (auth.uid() = user_id);

create table if not exists public.creator_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  raw_text    text not null,
  parsed      jsonb not null default '{}'::jsonb,
  status      text not null default 'captured'
    check (status in ('captured', 'suggested', 'project_started', 'archived')),
  project_id  uuid references public.cinematic_projects(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists creator_ideas_user_created_idx
  on public.creator_ideas (user_id, created_at desc);

alter table public.creator_ideas enable row level security;

drop policy if exists "creator_ideas self read" on public.creator_ideas;
create policy "creator_ideas self read"
  on public.creator_ideas for select
  using (auth.uid() = user_id);

drop policy if exists "creator_ideas self insert" on public.creator_ideas;
create policy "creator_ideas self insert"
  on public.creator_ideas for insert
  with check (auth.uid() = user_id);

drop policy if exists "creator_ideas self update" on public.creator_ideas;
create policy "creator_ideas self update"
  on public.creator_ideas for update
  using (auth.uid() = user_id);

create table if not exists public.creator_weekly_plan (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  plan        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists creator_weekly_plan_user_week_idx
  on public.creator_weekly_plan (user_id, week_start desc);

alter table public.creator_weekly_plan enable row level security;

drop policy if exists "creator_weekly_plan self read" on public.creator_weekly_plan;
create policy "creator_weekly_plan self read"
  on public.creator_weekly_plan for select
  using (auth.uid() = user_id);

drop policy if exists "creator_weekly_plan self insert" on public.creator_weekly_plan;
create policy "creator_weekly_plan self insert"
  on public.creator_weekly_plan for insert
  with check (auth.uid() = user_id);

drop policy if exists "creator_weekly_plan self update" on public.creator_weekly_plan;
create policy "creator_weekly_plan self update"
  on public.creator_weekly_plan for update
  using (auth.uid() = user_id);

create table if not exists public.creator_competitors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  channel_url text,
  platform    text,
  notes       text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists creator_competitors_user_idx
  on public.creator_competitors (user_id, created_at desc);

alter table public.creator_competitors enable row level security;

drop policy if exists "creator_competitors self read" on public.creator_competitors;
create policy "creator_competitors self read"
  on public.creator_competitors for select
  using (auth.uid() = user_id);

drop policy if exists "creator_competitors self insert" on public.creator_competitors;
create policy "creator_competitors self insert"
  on public.creator_competitors for insert
  with check (auth.uid() = user_id);

drop policy if exists "creator_competitors self update" on public.creator_competitors;
create policy "creator_competitors self update"
  on public.creator_competitors for update
  using (auth.uid() = user_id);

drop policy if exists "creator_competitors self delete" on public.creator_competitors;
create policy "creator_competitors self delete"
  on public.creator_competitors for delete
  using (auth.uid() = user_id);

-- Agent missions extend mission system — links to daily quests / XP without duplicating creator_profiles columns.
create table if not exists public.creator_missions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  mission_key   text not null,
  title         text not null,
  description   text,
  agent_label   text,
  status        text not null default 'active'
    check (status in ('active', 'completed', 'skipped', 'expired')),
  xp_reward     int not null default 0,
  payload       jsonb not null default '{}'::jsonb,
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists creator_missions_user_status_idx
  on public.creator_missions (user_id, status, created_at desc);

alter table public.creator_missions enable row level security;

drop policy if exists "creator_missions self read" on public.creator_missions;
create policy "creator_missions self read"
  on public.creator_missions for select
  using (auth.uid() = user_id);

drop policy if exists "creator_missions self insert" on public.creator_missions;
create policy "creator_missions self insert"
  on public.creator_missions for insert
  with check (auth.uid() = user_id);

drop policy if exists "creator_missions self update" on public.creator_missions;
create policy "creator_missions self update"
  on public.creator_missions for update
  using (auth.uid() = user_id);

comment on table public.creator_opportunities is 'Cached daily opportunity feed items personalized by creator DNA and memory.';
comment on table public.creator_ideas is 'Autonomous idea capture — raw notes parsed into structured suggestions.';
comment on table public.creator_weekly_plan is 'Weekly content roadmap: shorts, reels, long-form, experimental slots.';
comment on table public.creator_competitors is 'Manually added competitor channels for pattern-based insights.';
comment on table public.creator_missions is 'Agent-driven missions linked to mission system XP and quests.';
