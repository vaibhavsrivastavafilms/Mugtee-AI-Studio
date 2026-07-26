-- =============================================================================
-- PHASE 7 — ORPHANED OBJECTS
-- Storage paths in project-assets with no active project_assets row
-- (best-effort; path conventions: {userId}/{projectId}/...)
-- =============================================================================

-- Soft-deleted DB rows still holding storage
select
  id,
  bucket,
  storage_path,
  file_size,
  deleted_at,
  project_id
from public.project_assets
where deleted_at is not null
  and storage_path is not null
order by deleted_at desc
limit 100;

-- Active project_assets pointing at missing storage (cannot verify without API;
-- list paths that look like temp/render intermediates)
select
  bucket_id,
  name,
  round(coalesce((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) as mb,
  created_at
from storage.objects
where
  name ilike '%/temp/%'
  or name ilike '%/tmp/%'
  or name ilike '%/cache/%'
  or name ilike '%intermediate%'
  or name ilike '%preview%'
  or name ilike '%.partial%'
order by (metadata->>'size')::bigint desc nulls last
limit 100;
