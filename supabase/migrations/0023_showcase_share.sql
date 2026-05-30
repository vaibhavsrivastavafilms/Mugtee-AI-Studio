-- Phase 2.7 — Opt-in public showcase (default private).

alter table public.cinematic_projects
  add column if not exists share_as_showcase boolean not null default false;

comment on column public.cinematic_projects.share_as_showcase is
  'When true, project may appear on the public Made With Mugtee homepage gallery (sanitized fields only).';

create index if not exists cinematic_projects_showcase_idx
  on public.cinematic_projects (share_as_showcase, updated_at desc)
  where share_as_showcase = true;
