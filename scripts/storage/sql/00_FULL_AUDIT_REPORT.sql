-- =============================================================================
-- MUGTEE STORAGE RECOVERY — STEP 1 + 3: FULL AUDIT (READ ONLY)
-- Supabase Dashboard → SQL Editor → Run
-- Safe while Storage API returns HTTP 402.
-- Does NOT delete anything. Does NOT touch auth / profiles / projects.
-- =============================================================================

-- A) Totals vs Free plan (1 GB)
select
  now() as audited_at,
  (select count(*) from storage.objects) as total_objects,
  round(
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
    2
  ) as total_mb,
  round(
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0 / 1024.0,
    3
  ) as total_gb,
  case
    when coalesce(sum((metadata->>'size')::bigint), 0) > 1073741824
      then 'OVER_QUOTA'
    else 'UNDER_QUOTA'
  end as quota_status
from storage.objects;

-- B) Largest buckets
select
  coalesce(o.bucket_id, b.id) as bucket_id,
  b.public as is_public,
  count(o.id) as object_count,
  round(coalesce(sum((o.metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb,
  round(
    100.0 * coalesce(sum((o.metadata->>'size')::bigint), 0)
      / nullif((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    1
  ) as pct_of_total
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by coalesce(o.bucket_id, b.id), b.public
order by mb desc nulls last;

-- C) Unused / empty buckets
select
  b.id as bucket_id,
  b.public,
  b.created_at
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by b.id, b.public, b.created_at
having count(o.id) = 0
order by b.id;

-- D) Largest files (top 50)
select
  bucket_id,
  name as object_path,
  round(coalesce((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) as mb,
  created_at,
  updated_at
from storage.objects
order by (metadata->>'size')::bigint desc nulls last
limit 50;

-- E) Oldest files (top 50)
select
  bucket_id,
  name as object_path,
  round(coalesce((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) as mb,
  created_at,
  extract(day from (now() - created_at))::int as age_days
from storage.objects
order by created_at asc nulls last
limit 50;

-- F) Category classification (SAFE TO DELETE signal)
select
  case
    when name ilike '%failed%' or name ilike '%error%' or name ilike '%.partial%'
      then 'failed_renders'
    when name ilike '%/temp/%' or name ilike '%/tmp/%' or name ilike '%temporary%'
      or bucket_id in ('temporary', 'cache')
      then 'temporary_cache'
    when name ilike '%preview%' or name ilike '%thumb%' or bucket_id = 'thumbnails'
      then 'preview_thumbnails'
    when name ilike '%storyboard%' or bucket_id = 'storyboards'
      then 'storyboards'
    when name ilike '%generated%' or bucket_id = 'generated-images'
      or name ilike '%.png' or name ilike '%.webp' or name ilike '%.jpg'
      then 'generated_images'
    when name ilike '%.mp4' or name ilike '%.mov' or name ilike '%.webm'
      or bucket_id in ('reels', 'exports', 'renders')
      then 'video_exports_renders'
    when bucket_id in ('media', 'uploads', 'project-assets')
      then 'media_uploads_project_assets'
    else 'other'
  end as category,
  count(*) as objects,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb
from storage.objects
group by 1
order by mb desc;

-- G) Age distribution (regenerable buckets)
select
  bucket_id,
  case
    when created_at < now() - interval '30 days' then '30d+'
    when created_at < now() - interval '14 days' then '14d+'
    when created_at < now() - interval '7 days' then '7d+'
    when created_at < now() - interval '1 day' then '1d+'
    else 'recent'
  end as age_bucket,
  count(*) as objects,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb
from storage.objects
where bucket_id in (
  'reels', 'project-assets', 'media', 'storyboards', 'exports', 'renders',
  'temporary', 'cache', 'thumbnails', 'generated-images', 'preview',
  'voiceovers', 'music', 'uploads'
)
group by 1, 2
order by 1, 2;

-- H) Duplicate detection (same filename + size in a bucket)
select
  bucket_id,
  split_part(name, '/', -1) as filename,
  (metadata->>'size')::bigint as bytes,
  count(*) as copies,
  round(
    (count(*) - 1) * coalesce((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0,
    2
  ) as reclaimable_mb
from storage.objects
where metadata ? 'size'
group by bucket_id, split_part(name, '/', -1), (metadata->>'size')::bigint
having count(*) > 1
order by reclaimable_mb desc
limit 40;

-- I) Soft-deleted project_assets still pointing at storage (orphans)
select
  count(*) as soft_deleted_rows,
  round(coalesce(sum(file_size), 0) / 1024.0 / 1024.0, 2) as claimed_mb
from public.project_assets
where deleted_at is not null
  and storage_path is not null;

-- J) Temp / intermediate path scan
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
  or name ilike '%failed%'
order by (metadata->>'size')::bigint desc nulls last
limit 100;
