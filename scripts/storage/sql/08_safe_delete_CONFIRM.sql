-- =============================================================================
-- MUGTEE STORAGE RECOVERY — STEP 4: SAFE SQL CLEANUP (DESTRUCTIVE)
-- ONLY deletes regenerable storage.objects rows.
-- NEVER deletes auth.users, profiles, projects, subscriptions, payments,
-- settings, brand kits, migrations, creative history, or project config.
--
-- HOSTED SUPABASE REALITY:
--   storage.protect_delete usually BLOCKS this. If blocked, use Dashboard UI
--   or upgrade + `npm run storage:fresh-start`.
--
-- CONFIRMATION:
-- 1. Run 00_FULL_AUDIT_REPORT.sql first
-- 2. Set confirm_delete := true
-- 3. Run this script
-- =============================================================================

do $$
declare
  confirm_delete boolean := false; -- <<< SET TO true TO EXECUTE
  deleted_count bigint;
  deleted_bytes bigint;
begin
  if confirm_delete is not true then
    raise notice 'ABORT: confirm_delete is false. Set confirm_delete := true after reviewing audit.';
    return;
  end if;

  select
    count(*),
    coalesce(sum((metadata->>'size')::bigint), 0)
  into deleted_count, deleted_bytes
  from storage.objects
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

  raise notice 'About to delete % objects (~% MB) from regenerable buckets',
    deleted_count,
    round(deleted_bytes / 1024.0 / 1024.0, 2);

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

  get diagnostics deleted_count = row_count;
  raise notice 'Deleted % storage.objects rows', deleted_count;

  -- Soft-deleted asset pointers only (not projects / prompts / history)
  begin
    delete from public.project_assets where deleted_at is not null;
  exception
    when undefined_table then
      raise notice 'project_assets not found — skipped';
    when insufficient_privilege then
      raise notice 'No privilege on project_assets — skipped';
  end;

  raise notice 'Safe cleanup complete. Refresh Usage → Storage.';
end $$;

select
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as remaining_mb,
  count(*) as remaining_objects
from storage.objects;
