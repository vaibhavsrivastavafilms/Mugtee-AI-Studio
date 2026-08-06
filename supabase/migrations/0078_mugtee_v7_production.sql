-- Mugtee V7 — clean production OS schema (replaces legacy workflows)

create table if not exists public.v7_productions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null default 'Untitled production',
  prompt           text not null,
  status           text not null default 'draft'
    check (status in ('draft', 'planning', 'producing', 'completed', 'failed')),
  creative_brief   jsonb,
  current_stage    text,
  reel_url         text,
  mov_url          text,
  thumbnail_url    text,
  creator_pack_url text,
  export_status    text not null default 'pending'
    check (export_status in ('pending', 'queued', 'rendering', 'completed', 'failed')),
  timeline_json    jsonb,
  voice_url        text,
  music_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists v7_productions_user_updated_idx
  on public.v7_productions (user_id, updated_at desc);

create table if not exists public.v7_scenes (
  id             uuid primary key default gen_random_uuid(),
  production_id  uuid not null references public.v7_productions(id) on delete cascade,
  number         integer not null,
  script         jsonb not null default '{}'::jsonb,
  storyboard     jsonb not null default '{}'::jsonb,
  duration       numeric(8,2),
  created_at     timestamptz not null default now(),
  unique (production_id, number)
);

create index if not exists v7_scenes_production_idx on public.v7_scenes (production_id, number);

create table if not exists public.v7_stages (
  id             uuid primary key default gen_random_uuid(),
  production_id  uuid not null references public.v7_productions(id) on delete cascade,
  stage          text not null,
  status         text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input          jsonb,
  output         jsonb,
  error          text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (production_id, stage)
);

create index if not exists v7_stages_production_stage_idx
  on public.v7_stages (production_id, stage);

alter table public.v7_productions enable row level security;
alter table public.v7_scenes enable row level security;
alter table public.v7_stages enable row level security;

create policy "v7_productions self read" on public.v7_productions
  for select using (auth.uid() = user_id);
create policy "v7_productions self insert" on public.v7_productions
  for insert with check (auth.uid() = user_id);
create policy "v7_productions self update" on public.v7_productions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "v7_productions self delete" on public.v7_productions
  for delete using (auth.uid() = user_id);

create policy "v7_scenes via production" on public.v7_scenes for all using (
  exists (select 1 from public.v7_productions p where p.id = production_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v7_productions p where p.id = production_id and p.user_id = auth.uid())
);

create policy "v7_stages via production" on public.v7_stages for all using (
  exists (select 1 from public.v7_productions p where p.id = production_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.v7_productions p where p.id = production_id and p.user_id = auth.uid())
);
