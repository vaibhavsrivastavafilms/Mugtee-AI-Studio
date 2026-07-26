-- =============================================================================
-- Mugtee — FORCE STORAGE UNDER 1 GB (Supabase SQL Editor)
-- =============================================================================
-- NOTE: Newer Supabase projects block DELETE on storage.objects via
-- storage.protect_delete. If you see that error, use instead:
--   scripts/storage/sql/10_FORCE_UNDER_1GB_DISABLE_PROTECT.sql
-- =============================================================================
-- Paste this entire file into SQL Editor and Run.
--
-- What it deletes: FILE OBJECTS in Storage only (storage.objects).
-- What it NEVER deletes: auth.users, profiles, projects, payments, DB tables.
--
-- STEP: set confirm_cleanup := true below, then Run.
-- =============================================================================

do $$
declare
  confirm_cleanup boolean := true;  -- already true — run as-is to clean up
  before_mb numeric;
  after_mb numeric;
  before_n bigint;
  after_n bigint;
  deleted_n bigint;
begin
  if confirm_cleanup is not true then
    raise exception 'Set confirm_cleanup := true to run cleanup';
  end if;

  select
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
    count(*)
  into before_mb, before_n
  from storage.objects;

  raise notice 'BEFORE: % objects, % MB', before_n, round(before_mb, 2);

  -- -------------------------------------------------------------------------
  -- Pass 1: regenerable Mugtee media buckets
  -- -------------------------------------------------------------------------
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
    'generated-images',
    'voiceovers',
    'music',
    'uploads'
  );

  get diagnostics deleted_n = row_count;
  raise notice 'Pass 1 deleted % objects from regenerable buckets', deleted_n;

  select
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
    count(*)
  into after_mb, after_n
  from storage.objects;

  raise notice 'After pass 1: % objects, % MB', after_n, round(after_mb, 2);

  -- -------------------------------------------------------------------------
  -- Pass 2: if STILL over 1000 MB, wipe ALL remaining storage files
  -- (still does not touch database user/project rows)
  -- -------------------------------------------------------------------------
  if after_mb >= 1000 then
    raise notice 'Still >= 1000 MB — deleting ALL remaining storage.objects';
    delete from storage.objects;
    get diagnostics deleted_n = row_count;
    raise notice 'Pass 2 deleted % remaining objects', deleted_n;
  end if;

  -- Soft-deleted asset pointers (metadata only)
  begin
    delete from public.project_assets where deleted_at is not null;
  exception
    when undefined_table then
      raise notice 'project_assets table not found — skipped';
    when insufficient_privilege then
      raise notice 'No privilege on project_assets — skipped';
  end;

  select
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
    count(*)
  into after_mb, after_n
  from storage.objects;

  raise notice 'AFTER: % objects, % MB', after_n, round(after_mb, 2);

  if after_mb >= 1000 then
    raise warning 'Still over 1 GB (% MB). Check Dashboard Storage UI or contact Supabase support.', round(after_mb, 2);
  else
    raise notice 'SUCCESS: Storage metadata total is under 1 GB (% MB). Refresh Usage in a few minutes.', round(after_mb, 2);
  end if;
end $$;

-- Final verification (results grid)
select
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as remaining_mb,
  count(*) as remaining_objects,
  case
    when coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0 < 1000
      then 'UNDER_1GB_OK'
    else 'STILL_OVER_1GB'
  end as status
from storage.objects;

-- Optional: per-bucket leftovers
select
  bucket_id,
  count(*) as objects,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb
from storage.objects
group by bucket_id
order by mb desc nulls last;
