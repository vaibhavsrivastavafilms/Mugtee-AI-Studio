-- Mugtee Timeline Editor — persisted Remotion timeline JSON (Phase 1 MVP)
alter table public.cinematic_projects
  add column if not exists timeline_json jsonb;

comment on column public.cinematic_projects.timeline_json is
  'Mugtee Timeline Editor project JSON (scenes, audio, captions, motion) for Remotion preview/export.';
