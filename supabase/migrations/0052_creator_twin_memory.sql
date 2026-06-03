-- MugteeOS Phase 3: Creator Twin & persistent memory (extends 0042, no duplicate tables)

-- Multi-brand memory spaces (e.g. Table Tales)
create table if not exists public.brand_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  slug          text not null,
  display_name  text not null,
  dna           jsonb not null default '{}'::jsonb,
  preferences   jsonb not null default '{}'::jsonb,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists brand_profiles_user_idx
  on public.brand_profiles (user_id);

alter table public.brand_profiles enable row level security;

drop policy if exists "brand_profiles self all" on public.brand_profiles;
create policy "brand_profiles self all"
  on public.brand_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.brand_profiles is
  'Per-brand creator memory (Table Tales, etc.) — isolated DNA and prefs';

-- Detected patterns (formats, campaigns, hooks)
create table if not exists public.creator_patterns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  pattern_type  text not null,
  label         text not null,
  strength      real not null default 1,
  payload       jsonb not null default '{}'::jsonb,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (user_id, brand_id, pattern_type, label)
);

create index if not exists creator_patterns_user_type_idx
  on public.creator_patterns (user_id, pattern_type, strength desc);

alter table public.creator_patterns enable row level security;

drop policy if exists "creator_patterns self all" on public.creator_patterns;
create policy "creator_patterns self all"
  on public.creator_patterns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Explicit feedback signals
create table if not exists public.creator_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  project_id    uuid references public.cinematic_projects(id) on delete set null,
  feedback_type text not null,
  aspect        text,
  rating        smallint check (rating is null or (rating >= -1 and rating <= 1)),
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists creator_feedback_user_created_idx
  on public.creator_feedback (user_id, created_at desc);

alter table public.creator_feedback enable row level security;

drop policy if exists "creator_feedback self all" on public.creator_feedback;
create policy "creator_feedback self all"
  on public.creator_feedback for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Agent-scoped durable memories (typed: identity, brand, workflow, preference, feedback)
create table if not exists public.agent_memories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  memory_type   text not null
    check (memory_type in ('identity', 'brand', 'workflow', 'preference', 'feedback')),
  key           text not null,
  content       text not null,
  embedding     jsonb,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, brand_id, memory_type, key)
);

create index if not exists agent_memories_user_type_idx
  on public.agent_memories (user_id, memory_type);

alter table public.agent_memories enable row level security;

drop policy if exists "agent_memories self all" on public.agent_memories;
create policy "agent_memories self all"
  on public.agent_memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Content history linked to cinematic_projects
create table if not exists public.content_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.cinematic_projects(id) on delete set null,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  content_type  text not null,
  title         text,
  hook          text,
  theme         text,
  platform      text,
  format        text,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists content_history_user_created_idx
  on public.content_history (user_id, created_at desc);
create index if not exists content_history_project_idx
  on public.content_history (project_id);

alter table public.content_history enable row level security;

drop policy if exists "content_history self all" on public.content_history;
create policy "content_history self all"
  on public.content_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Embeddings store (jsonb vector — semantic search in app via OpenAI)
create table if not exists public.memory_embeddings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  source_type   text not null,
  source_id     text not null,
  text_preview  text not null,
  embedding     jsonb not null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create index if not exists memory_embeddings_user_idx
  on public.memory_embeddings (user_id, source_type);

alter table public.memory_embeddings enable row level security;

drop policy if exists "memory_embeddings self all" on public.memory_embeddings;
create policy "memory_embeddings self all"
  on public.memory_embeddings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.agent_memories is 'Typed persistent memories for MugteeOS agent retrieval';
comment on table public.content_history is 'Project/campaign content lineage for creator twin';
comment on table public.memory_embeddings is 'OpenAI embedding vectors (jsonb) for semantic recall';
