-- Unified creator OS — mode + Virlo metadata on cinematic_projects.
-- video_url / thumbnail_url already added in 0015.

alter table public.cinematic_projects
  add column if not exists mode text not null default 'director',
  add column if not exists virlo jsonb;

create index if not exists cinematic_projects_user_mode_idx
  on public.cinematic_projects (user_id, mode, updated_at desc);
