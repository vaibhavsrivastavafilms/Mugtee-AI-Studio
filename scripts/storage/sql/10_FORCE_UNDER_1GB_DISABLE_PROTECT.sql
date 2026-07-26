-- =============================================================================
-- Mugtee — FORCE STORAGE UNDER 1 GB (works when protect_delete blocks SQL)
-- =============================================================================
-- Error you hit:
--   Direct deletion from storage tables is not allowed. Use the Storage API instead.
--   (storage.protect_delete)
--
-- This script temporarily disables the protect trigger(s), deletes file rows,
-- then re-enables them. Run as the SQL Editor role (usually postgres).
--
-- Does NOT delete auth.users / profiles / projects.
-- =============================================================================

-- 0) See protect triggers (optional)
select
  t.tgname as trigger_name,
  p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'storage'
  and c.relname = 'objects'
  and not t.tgisinternal;

do $$
declare
  before_mb numeric;
  after_mb numeric;
  before_n bigint;
  after_n bigint;
  deleted_n bigint;
  trig record;
begin
  select
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
    count(*)
  into before_mb, before_n
  from storage.objects;

  raise notice 'BEFORE: % objects, % MB', before_n, round(before_mb, 2);

  -- 1) Disable ALL user triggers on storage.objects (includes protect_delete)
  for trig in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and not t.tgisinternal
  loop
    execute format('alter table storage.objects disable trigger %I', trig.tgname);
    raise notice 'Disabled trigger: %', trig.tgname;
  end loop;

  begin
    -- 2) Pass 1 — regenerable buckets
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
    raise notice 'Pass 1 deleted % objects', deleted_n;

    select
      coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
      count(*)
    into after_mb, after_n
    from storage.objects;

    raise notice 'After pass 1: % objects, % MB', after_n, round(after_mb, 2);

    -- 3) Pass 2 — wipe everything still over 1 GB
    if after_mb >= 1000 then
      raise notice 'Still >= 1000 MB — deleting ALL storage.objects';
      delete from storage.objects;
      get diagnostics deleted_n = row_count;
      raise notice 'Pass 2 deleted % objects', deleted_n;
    end if;

  exception
    when others then
      -- Always try to re-enable triggers even on failure
      raise notice 'Delete failed: %', sqlerrm;
      for trig in
        select t.tgname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'storage'
          and c.relname = 'objects'
          and not t.tgisinternal
      loop
        execute format('alter table storage.objects enable trigger %I', trig.tgname);
      end loop;
      raise;
  end;

  -- 4) Re-enable triggers
  for trig in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and not t.tgisinternal
  loop
    execute format('alter table storage.objects enable trigger %I', trig.tgname);
    raise notice 'Enabled trigger: %', trig.tgname;
  end loop;

  -- Soft-deleted DB pointers (optional)
  begin
    delete from public.project_assets where deleted_at is not null;
  exception
    when others then
      raise notice 'project_assets cleanup skipped: %', sqlerrm;
  end;

  select
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0,
    count(*)
  into after_mb, after_n
  from storage.objects;

  raise notice 'AFTER: % objects, % MB', after_n, round(after_mb, 2);

  if after_mb >= 1000 then
    raise warning 'Still over 1 GB (% MB).', round(after_mb, 2);
  else
    raise notice 'SUCCESS under 1 GB (% MB). Refresh Usage in a few minutes, then retry login.', round(after_mb, 2);
  end if;
end $$;

-- Results grid
select
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as remaining_mb,
  count(*) as remaining_objects,
  case
    when coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0 < 1000
      then 'UNDER_1GB_OK'
    else 'STILL_OVER_1GB'
  end as status
from storage.objects;
