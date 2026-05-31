-- Mugtee V3 Companion Memory OS
-- Extends creator_profiles with DNA, relationship, memory graph; event tables for learning loop.

-- Option A: extend creator_profiles
alter table public.creator_profiles
  add column if not exists creator_dna jsonb not null default '{}'::jsonb,
  add column if not exists relationship_level text not null default 'explorer'
    check (relationship_level in ('explorer', 'collaborator', 'partner', 'director', 'creative_soulmate')),
  add column if not exists relationship_score int not null default 0
    check (relationship_score >= 0),
  add column if not exists memory_graph jsonb not null default '{}'::jsonb,
  add column if not exists learning_events jsonb not null default '[]'::jsonb;

comment on column public.creator_profiles.creator_dna is
  'Creator DNA: creatorType, audience, format, emotionalTrigger, voice, visualStyle';
comment on column public.creator_profiles.relationship_level is
  'Companion relationship tier: explorer → creative_soulmate';
comment on column public.creator_profiles.relationship_score is
  'Cumulative engagement score driving relationship_level';
comment on column public.creator_profiles.memory_graph is
  'Lightweight knowledge graph: topics, projects, hooks linked by edges';
comment on column public.creator_profiles.learning_events is
  'Recent inline learning events (max ~50, trimmed in app)';

-- Option B: event + journal + learning tables
create table if not exists public.creator_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,
  project_id  uuid references public.cinematic_projects(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists creator_events_user_created_idx
  on public.creator_events (user_id, created_at desc);
create index if not exists creator_events_type_idx
  on public.creator_events (user_id, event_type);

alter table public.creator_events enable row level security;

drop policy if exists "creator_events self read" on public.creator_events;
create policy "creator_events self read"
  on public.creator_events for select
  using (auth.uid() = user_id);

drop policy if exists "creator_events self insert" on public.creator_events;
create policy "creator_events self insert"
  on public.creator_events for insert
  with check (auth.uid() = user_id);

create table if not exists public.creator_journal (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.cinematic_projects(id) on delete set null,
  entry_type  text not null default 'snapshot',
  title       text,
  hook        text,
  theme       text,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists creator_journal_user_created_idx
  on public.creator_journal (user_id, created_at desc);

alter table public.creator_journal enable row level security;

drop policy if exists "creator_journal self read" on public.creator_journal;
create policy "creator_journal self read"
  on public.creator_journal for select
  using (auth.uid() = user_id);

drop policy if exists "creator_journal self insert" on public.creator_journal;
create policy "creator_journal self insert"
  on public.creator_journal for insert
  with check (auth.uid() = user_id);

create table if not exists public.creator_learning (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.cinematic_projects(id) on delete set null,
  summary     text not null,
  worked      jsonb not null default '[]'::jsonb,
  improve     jsonb not null default '[]'::jsonb,
  learned     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists creator_learning_user_created_idx
  on public.creator_learning (user_id, created_at desc);

alter table public.creator_learning enable row level security;

drop policy if exists "creator_learning self read" on public.creator_learning;
create policy "creator_learning self read"
  on public.creator_learning for select
  using (auth.uid() = user_id);

drop policy if exists "creator_learning self insert" on public.creator_learning;
create policy "creator_learning self insert"
  on public.creator_learning for insert
  with check (auth.uid() = user_id);

comment on table public.creator_events is
  'Learning loop events: hook_accept, regen, export, feedback, project_save';
comment on table public.creator_journal is
  'Creator journal snapshots — ideas, script refs per project';
comment on table public.creator_learning is
  'Post-project reflection summaries from Memory OS';
