-- Mugtee V3 MVP — export deliverables on projects

alter table public.v3_projects
  add column if not exists voice_url text,
  add column if not exists music_url text,
  add column if not exists captions_json jsonb not null default '[]'::jsonb,
  add column if not exists timeline_json jsonb,
  add column if not exists reel_url text,
  add column if not exists export_status text not null default 'pending'
    check (export_status in ('pending', 'queued', 'rendering', 'completed', 'failed'));

create index if not exists v3_projects_export_status_idx
  on public.v3_projects (export_status);
