-- =============================================================================
-- PHASE 3 — OBJECT COUNT + AGE DISTRIBUTION
-- =============================================================================

select
  bucket_id,
  count(*) as objects,
  count(*) filter (where created_at < now() - interval '7 days') as older_than_7d,
  count(*) filter (where created_at < now() - interval '30 days') as older_than_30d,
  min(created_at) as oldest,
  max(created_at) as newest
from storage.objects
group by bucket_id
order by objects desc;
