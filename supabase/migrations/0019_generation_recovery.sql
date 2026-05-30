-- Generation recovery: track pipeline status for resume after failures.

alter table public.cinematic_projects
  add column if not exists generation_status text,
  add column if not exists generation_step text,
  add column if not exists generation_error text,
  add column if not exists last_completed_step text;

comment on column public.cinematic_projects.generation_status is
  'pending | generating | completed | failed';
comment on column public.cinematic_projects.generation_step is
  'hook | script | visual_direction | storyboard | voice | export';
comment on column public.cinematic_projects.generation_error is
  'User-safe error summary when generation_status = failed';
comment on column public.cinematic_projects.last_completed_step is
  'Last pipeline step that completed successfully before fail or pause';
