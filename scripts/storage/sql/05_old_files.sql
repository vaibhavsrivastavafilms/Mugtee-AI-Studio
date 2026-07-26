-- =============================================================================
-- PHASE 5 — OLD FILES (regenerable buckets, > 7 / 14 / 30 days)
-- =============================================================================

select
  bucket_id,
  case
    when created_at < now() - interval '30 days' then '30d+'
    when created_at < now() - interval '14 days' then '14d+'
    when created_at < now() - interval '7 days' then '7d+'
    else 'recent'
  end as age_bucket,
  count(*) as objects,
  round(coalesce(sum((metadata->>'size')::bigint), 0) / 1024.0 / 1024.0, 2) as mb
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
)
group by 1, 2
order by 1, 2;
