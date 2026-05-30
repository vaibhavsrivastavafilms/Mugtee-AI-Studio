-- Track active Remotion reel export job id for serverless poll recovery.

alter table public.cinematic_projects
  add column if not exists reel_job_id text;

comment on column public.cinematic_projects.reel_job_id is
  'In-flight reel export job id (reel-{uuid}-{ts}); cleared when reel_url is written';

create index if not exists cinematic_projects_reel_job_id_idx
  on public.cinematic_projects (reel_job_id)
  where reel_job_id is not null;
