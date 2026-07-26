-- =============================================================================
-- PHASE 4 — LARGEST FILES (top 50)
-- Likely: final-reel.mp4, voiceovers, storyboard PNGs
-- =============================================================================

select
  bucket_id,
  name as object_path,
  round(coalesce((metadata->>'size')::bigint, 0) / 1024.0 / 1024.0, 2) as mb,
  created_at,
  updated_at
from storage.objects
order by (metadata->>'size')::bigint desc nulls last
limit 50;
