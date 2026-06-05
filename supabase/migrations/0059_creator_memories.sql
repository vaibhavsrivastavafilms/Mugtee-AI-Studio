-- Director Memory Engine (Mugtee V4) — per-user director-specific creative aggregates

create table if not exists public.creator_memories (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  story_memory        jsonb not null default '{}'::jsonb,
  visual_memory       jsonb not null default '{}'::jsonb,
  voice_memory        jsonb not null default '{}'::jsonb,
  motion_memory       jsonb not null default '{}'::jsonb,
  creator_preferences jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists creator_memories_user_idx
  on public.creator_memories (user_id);

alter table public.creator_memories enable row level security;

drop policy if exists "creator_memories self all" on public.creator_memories;
create policy "creator_memories self all"
  on public.creator_memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.creator_memories is
  'Director Mode aggregate memory — story, visual, voice, motion, and creator preferences learned from completed projects';
