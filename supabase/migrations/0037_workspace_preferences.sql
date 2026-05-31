-- Mugtee Creator Command Center — per-project workspace layout persistence.
-- Chosen table: cinematic_projects (not profiles) because timeline_state and
-- workspace_layout are project-scoped; panel_preferences here mirror localStorage
-- for cross-device resume. User-global UI prefs remain in studio-workspace-store.

alter table public.cinematic_projects
  add column if not exists workspace_layout jsonb not null default '{}'::jsonb,
  add column if not exists timeline_state jsonb not null default '{}'::jsonb,
  add column if not exists panel_preferences jsonb not null default '{}'::jsonb;

comment on column public.cinematic_projects.workspace_layout is
  'Command Center shell layout — sidebar/timeline/director column visibility and sizes.';
comment on column public.cinematic_projects.timeline_state is
  'Command Center pipeline — last active stage, collapsed nodes, scene focus.';
comment on column public.cinematic_projects.panel_preferences is
  'Command Center panel prefs — continuity expanded, director panel open; synced from client when saved.';
