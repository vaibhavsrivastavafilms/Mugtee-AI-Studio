-- MugteeOS Phase 4 — Creative Asset Operating System
-- Universal asset registry + relations + versions (extends project_assets, no duplicate blobs)

-- Extend project_assets for tagging and inline relation hints
alter table public.project_assets
  add column if not exists tags text[] not null default '{}',
  add column if not exists brand_id uuid references public.brand_profiles(id) on delete set null,
  add column if not exists relations jsonb not null default '{}'::jsonb,
  add column if not exists version_root_id uuid,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists project_assets_brand_idx
  on public.project_assets (user_id, brand_id, created_at desc);

comment on column public.project_assets.tags is 'User/AI tags for asset OS search';
comment on column public.project_assets.relations is 'Inline relation hints { parentIds, childIds, relationType }';

-- Universal creative asset index (metadata only — blobs stay in project_assets / storage)
create table if not exists public.creative_assets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null check (type in (
    'script', 'voiceover', 'storyboard', 'image', 'video', 'campaign',
    'calendar', 'document', 'brand_asset', 'template', 'export'
  )),
  title           text not null default 'Untitled',
  description     text,
  tags            text[] not null default '{}',
  brand_id        uuid references public.brand_profiles(id) on delete set null,
  project_id      uuid references public.cinematic_projects(id) on delete set null,
  source_type     text not null,
  source_id       text not null,
  content_hash    text,
  metadata        jsonb not null default '{}'::jsonb,
  current_version_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create index if not exists creative_assets_user_type_idx
  on public.creative_assets (user_id, type, updated_at desc);
create index if not exists creative_assets_user_brand_idx
  on public.creative_assets (user_id, brand_id, updated_at desc);
create index if not exists creative_assets_project_idx
  on public.creative_assets (project_id, updated_at desc);
create index if not exists creative_assets_tags_gin
  on public.creative_assets using gin (tags);
create index if not exists creative_assets_hash_idx
  on public.creative_assets (user_id, content_hash);

alter table public.creative_assets enable row level security;

drop policy if exists "creative_assets self all" on public.creative_assets;
create policy "creative_assets self all"
  on public.creative_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Campaign → Script → Storyboard → Voice → Thumbnail graph
create table if not exists public.asset_relations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  parent_id       uuid not null references public.creative_assets(id) on delete cascade,
  child_id        uuid not null references public.creative_assets(id) on delete cascade,
  relation_type   text not null check (relation_type in (
    'campaign_contains', 'script_for', 'storyboard_from', 'voice_for',
    'thumbnail_for', 'export_of', 'derived_from', 'related'
  )),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (user_id, parent_id, child_id, relation_type)
);

create index if not exists asset_relations_parent_idx
  on public.asset_relations (parent_id);
create index if not exists asset_relations_child_idx
  on public.asset_relations (child_id);

alter table public.asset_relations enable row level security;

drop policy if exists "asset_relations self all" on public.asset_relations;
create policy "asset_relations self all"
  on public.asset_relations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Version chain: original → edited → regenerated → published
create table if not exists public.asset_versions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  asset_id        uuid not null references public.creative_assets(id) on delete cascade,
  version_kind    text not null check (version_kind in (
    'original', 'edited', 'regenerated', 'published'
  )),
  label           text,
  snapshot        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists asset_versions_asset_idx
  on public.asset_versions (asset_id, created_at desc);

alter table public.asset_versions enable row level security;

drop policy if exists "asset_versions self all" on public.asset_versions;
create policy "asset_versions self all"
  on public.asset_versions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.creative_assets
  drop constraint if exists creative_assets_current_version_fk;
alter table public.creative_assets
  add constraint creative_assets_current_version_fk
  foreign key (current_version_id) references public.asset_versions(id) on delete set null;

comment on table public.creative_assets is 'MugteeOS universal asset index — search, relations, versions';
comment on table public.asset_relations is 'Creative asset dependency graph';
comment on table public.asset_versions is 'Asset version chain snapshots';
