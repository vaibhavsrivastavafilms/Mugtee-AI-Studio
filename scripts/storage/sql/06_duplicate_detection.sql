-- =============================================================================
-- PHASE 6 — DUPLICATE DETECTION
-- A) Same path basename + size in a bucket
-- B) project_assets rows sharing sha256 (DB-level duplicates)
-- =============================================================================

-- Storage: identical size + filename within a bucket
select
  bucket_id,
  split_part(name, '/', -1) as filename,
  (metadata->>'size')::bigint as bytes,
  count(*) as copies,
  round(count(*) * coalesce((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) as mb_if_all_kept
from storage.objects
where metadata ? 'size'
group by bucket_id, split_part(name, '/', -1), (metadata->>'size')::bigint
having count(*) > 1
order by copies * coalesce((metadata->>'size')::bigint, 0) desc
limit 40;

-- DB: duplicate scene images by checksum
select
  project_id,
  scene_id,
  sha256,
  count(*) as rows,
  array_agg(id) as asset_ids
from public.project_assets
where deleted_at is null
  and sha256 is not null
  and scene_id is not null
group by project_id, scene_id, sha256
having count(*) > 1
order by count(*) desc
limit 40;
