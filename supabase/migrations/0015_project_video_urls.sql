-- Faceless render outputs on cinematic_projects
alter table public.cinematic_projects
  add column if not exists video_url text,
  add column if not exists thumbnail_url text;
