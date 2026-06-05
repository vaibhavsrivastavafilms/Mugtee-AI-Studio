-- Creator Intelligence Graph (Mugtee V6) — unified director-mode creator intelligence layer

create table if not exists public.creator_intelligence_graph (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  graph_data  jsonb not null default '{}'::jsonb,
  insights    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists creator_intelligence_graph_user_idx
  on public.creator_intelligence_graph (user_id);

alter table public.creator_intelligence_graph enable row level security;

drop policy if exists "creator_intelligence_graph self all" on public.creator_intelligence_graph;
create policy "creator_intelligence_graph self all"
  on public.creator_intelligence_graph for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.creator_intelligence_graph is
  'Director Mode V6 — unified creator intelligence graph merging memory, producer reports, frameworks, and DNA';
