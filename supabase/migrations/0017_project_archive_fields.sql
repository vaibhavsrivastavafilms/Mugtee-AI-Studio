-- Unified cinematic library archive fields.
-- video_url / thumbnail_url: 0015. mode / virlo: 0016. storyboard: quick-cut scene archive mirror.

alter table public.cinematic_projects
  add column if not exists storyboard jsonb;

create index if not exists cinematic_projects_user_status_idx
  on public.cinematic_projects (user_id, status, updated_at desc);
