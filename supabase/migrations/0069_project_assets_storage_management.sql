-- Storage asset management: dedup, soft-delete, verification, scene linkage
alter table public.project_assets
  add column if not exists scene_id text,
  add column if not exists bucket text not null default 'project-assets',
  add column if not exists sha256 text,
  add column if not exists file_size bigint,
  add column if not exists deleted_at timestamptz,
  add column if not exists last_verified_at timestamptz;

-- Backfill scene_id from metadata
update public.project_assets
set scene_id = metadata->>'scene_id'
where scene_id is null
  and metadata ? 'scene_id'
  and (metadata->>'scene_id') is not null
  and (metadata->>'scene_id') <> '';

-- Backfill bucket from storage_path when missing
update public.project_assets
set bucket = 'project-assets'
where bucket is null or bucket = '';

create index if not exists project_assets_scene_idx
  on public.project_assets (project_id, scene_id, kind)
  where deleted_at is null;

create index if not exists project_assets_sha256_idx
  on public.project_assets (project_id, scene_id, sha256)
  where deleted_at is null and sha256 is not null;

create index if not exists project_assets_deleted_idx
  on public.project_assets (deleted_at)
  where deleted_at is not null;

create index if not exists project_assets_storage_path_idx
  on public.project_assets (storage_path)
  where deleted_at is null and storage_path is not null;

-- Service role can hard-delete soft-deleted rows (cleanup jobs)
drop policy if exists "assets self update" on public.project_assets;
create policy "assets self update"
  on public.project_assets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
