-- Performance indexes (idempotent). Core composites already exist:
--   cinematic_projects (user_id, updated_at desc) — 0014
--   creator_events (user_id, created_at desc) — 0042

create index if not exists cinematic_projects_user_id_idx
  on public.cinematic_projects (user_id);
