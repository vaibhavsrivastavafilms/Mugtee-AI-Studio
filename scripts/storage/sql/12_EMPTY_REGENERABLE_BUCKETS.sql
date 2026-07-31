-- =============================================================================
-- MUGTEE STORAGE RECOVERY — STEP 5: EMPTY ONLY REGENERABLE BUCKETS
-- Use if storage is STILL above 1 GB after safe cleanup.
-- Deletes OBJECTS only — does NOT drop buckets.
-- Never touches auth / profiles / projects / payments / migrations.
--
-- If error: "Direct deletion from storage tables is not allowed"
-- → SQL path is blocked. Use Dashboard Storage UI or:
--   npm run storage:fresh-start  (after temporary upgrade unlocks API)
-- =============================================================================

-- Snapshot before
select
  'BEFORE' as phase,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb,
  count(*) as objects
from storage.objects;

delete from storage.objects
where bucket_id in (
  'renders',
  'exports',
  'storyboards',
  'generated-images',
  'temporary',
  'cache',
  'preview',
  'thumbnails',
  'media',
  'project-assets',
  'reels',
  'voiceovers',
  'music',
  'uploads'
);

-- Snapshot after
select
  'AFTER' as phase,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb,
  count(*) as objects,
  case
    when coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0 < 1000
      then 'UNDER_1GB_OK'
    else 'STILL_OVER_1GB'
  end as status
from storage.objects;

-- Leftovers by bucket (should be empty regenerable + any protected buckets)
select
  bucket_id,
  count(*) as objects,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb
from storage.objects
group by bucket_id
order by mb desc nulls last;
