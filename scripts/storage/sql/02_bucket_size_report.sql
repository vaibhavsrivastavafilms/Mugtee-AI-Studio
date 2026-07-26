-- =============================================================================
-- PHASE 2 — BUCKET SIZE REPORT
-- =============================================================================

select
  bucket_id,
  count(*) as object_count,
  coalesce(sum((metadata->>'size')::bigint), 0) as bytes,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb,
  round(
    100.0 * coalesce(sum((metadata->>'size')::bigint), 0)
      / nullif((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    1
  ) as pct_of_total
from storage.objects
group by bucket_id
order by bytes desc nulls last;
