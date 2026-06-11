-- Pipeline orchestrator columns (Phase 5 — single source of truth for export state).

alter table public.generation_jobs
  add column if not exists pipeline_status text,
  add column if not exists current_stage text,
  add column if not exists final_mp4_url text,
  add column if not exists failed_stage text,
  add column if not exists error_message text;

create index if not exists generation_jobs_pipeline_status_idx
  on public.generation_jobs (pipeline_status);

comment on column public.generation_jobs.pipeline_status is
  'Orchestrator status: script_generating … mp4_complete | failed';
comment on column public.generation_jobs.current_stage is
  'Active pipeline stage id: script | images | video | voice | captions | timeline | mp4';
comment on column public.generation_jobs.final_mp4_url is
  'Validated MP4 download URL — set only when pipeline_status = mp4_complete';
comment on column public.generation_jobs.failed_stage is
  'Stage label when pipeline_status = failed (script | images | video | voice | captions | timeline | export)';
comment on column public.generation_jobs.error_message is
  'User-facing failure detail when pipeline_status = failed';
