-- Mugtee Director Edit — non-destructive rewrite audit trail per project.
create table if not exists public.project_edits (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.cinematic_projects(id) on delete cascade,
  content_type   text not null,
  before_text    text not null,
  after_text     text not null,
  rewrite_action text not null,
  created_at     timestamptz not null default now()
);

create index if not exists project_edits_project_idx
  on public.project_edits (project_id, created_at desc);

alter table public.project_edits enable row level security;

drop policy if exists "project_edits owner read" on public.project_edits;
create policy "project_edits owner read"
  on public.project_edits for select
  using (
    exists (
      select 1 from public.cinematic_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "project_edits owner insert" on public.project_edits;
create policy "project_edits owner insert"
  on public.project_edits for insert
  with check (
    exists (
      select 1 from public.cinematic_projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

comment on table public.project_edits is
  'Director Edit rewrite history — before/after text per highlight rewrite accept';
