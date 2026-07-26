-- =============================================================================
-- PHASE 8 — SAFE DELETE (DESTRUCTIVE)
-- NEVER deletes auth.users, profiles, projects, payments, migrations.
-- ONLY deletes regenerable storage.objects rows.
--
-- CONFIRMATION REQUIRED:
-- 1. Run 01–07 first and note recoverable MB
-- 2. Replace the token below: set confirm_delete = true
-- 3. Run this entire script
-- =============================================================================

do $$
declare
  confirm_delete boolean := false; -- <<< SET TO true TO EXECUTE
  deleted_count bigint;
  deleted_bytes bigint;
begin
  if confirm_delete is not true then
    raise notice 'ABORT: confirm_delete is false. Set confirm_delete := true after reviewing inventory.';
    return;
  end if;

  -- Snapshot before
  select
    count(*),
    coalesce(sum((metadata->>'size')::bigint), 0)
  into deleted_count, deleted_bytes
  from storage.objects
  where bucket_id in (
    'reels',
    'project-assets',
    'media',
    'storyboards',
    'exports',
    'renders',
    'temporary',
    'cache',
    'thumbnails',
    'generated-images'
  );

  raise notice 'About to delete % objects (~% MB) from regenerable buckets',
    deleted_count,
    round(deleted_bytes / 1024.0 / 1024.0, 2);

  delete from storage.objects
  where bucket_id in (
    'reels',
    'project-assets',
    'media',
    'storyboards',
    'exports',
    'renders',
    'temporary',
    'cache',
    'thumbnails',
    'generated-images'
  );

  get diagnostics deleted_count = row_count;
  raise notice 'Deleted % storage.objects rows', deleted_count;

  -- Soft-deleted asset rows: hard-delete orphan DB pointers (metadata only)
  delete from public.project_assets
  where deleted_at is not null;

  raise notice 'Cleanup complete. Refresh Usage → Storage should drop under 1 GB within minutes.';
end $$;

-- Post-delete verification
select
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as remaining_mb,
  count(*) as remaining_objects
from storage.objects;

-- NEVER run unless still over quota after regenerable purge:
-- delete from storage.objects;
