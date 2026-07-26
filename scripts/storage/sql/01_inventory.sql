-- =============================================================================
-- PHASE 1 — STORAGE INVENTORY
-- Run in Supabase Dashboard → SQL Editor
-- READ ONLY — safe while project is restricted (402 on Storage API)
-- =============================================================================

-- Plan context (from dashboard): Free plan Storage limit = 1 GB
-- Current violation: exceed_storage_size_quota (~2 GB reported)

select
  now() as audited_at,
  (select count(*) from storage.objects) as total_objects,
  round(
    coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0 / 1024.0,
    3
  ) as total_storage_gb
from storage.objects;
