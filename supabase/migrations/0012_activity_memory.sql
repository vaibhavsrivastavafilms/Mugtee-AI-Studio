-- =============================================================
-- MUGTEE V3.5 — Creator Memory + Activity Timeline
-- Extends the EXISTING `team_activity` table (Live Pulse data source) with
-- per-project event tracking. Zero new tables, zero new RLS — we ride on
-- the same owner-only policies already in place.
--
-- New columns:
--   project_id  → joins to content_pieces.id (nullable for legacy/global events)
--   event_type  → typed event taxonomy (e.g. 'script_generated', 'voiceover_generated')
--   metadata    → optional jsonb context (word count, asset count, mode, etc.)
--
-- IDEMPOTENT: safe to re-run.
-- =============================================================
alter table public.team_activity
  add column if not exists project_id uuid references public.content_pieces(id) on delete cascade,
  add column if not exists event_type text,
  add column if not exists metadata   jsonb not null default '{}'::jsonb;

-- Fast per-project timeline queries (chronological).
create index if not exists team_activity_project_idx
  on public.team_activity (project_id, created_at desc)
  where project_id is not null;

-- Fast event-type filtering (used by stage derivation + Live Pulse icons).
create index if not exists team_activity_event_idx
  on public.team_activity (user_id, event_type, created_at desc)
  where event_type is not null;
