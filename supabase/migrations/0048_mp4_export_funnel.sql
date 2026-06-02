-- MP4 export funnel — failure visibility view (analytics_events.event = mp4_failed)
-- Idempotent — safe to re-run.

create index if not exists analytics_events_mp4_failed_idx
  on public.analytics_events (created_at desc)
  where event = 'mp4_failed';

create or replace view public.mp4_export_failures as
select
  e.id,
  e.created_at::date as date,
  e.user_id,
  coalesce(e.metadata->>'projectId', e.metadata->>'project_id') as project_id,
  coalesce(e.metadata->>'error_code', 'Export Request Failed') as error,
  coalesce(e.metadata->>'stage', 'unknown') as stage,
  left(coalesce(e.metadata->>'message', ''), 500) as message,
  e.metadata,
  e.page
from public.analytics_events e
where e.event = 'mp4_failed';

comment on view public.mp4_export_failures is
  'Structured MP4 export failures for founder debugging (service-role reads only).';
