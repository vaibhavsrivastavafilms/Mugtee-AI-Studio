-- Phase 3.1 — Founding Creator Beta Program + post-generation project feedback
-- Idempotent — safe to re-run.

create table if not exists public.founding_creator_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  email        text not null,
  platform     text not null,
  creator_type text not null,
  volume       text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)
);

create index if not exists founding_creator_applications_created_idx
  on public.founding_creator_applications (created_at desc);

alter table public.founding_creator_applications enable row level security;

drop policy if exists founding_creator_applications_select_self on public.founding_creator_applications;
create policy founding_creator_applications_select_self on public.founding_creator_applications
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists founding_creator_applications_insert_self on public.founding_creator_applications;
create policy founding_creator_applications_insert_self on public.founding_creator_applications
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists founding_creator_applications_update_self on public.founding_creator_applications;
create policy founding_creator_applications_update_self on public.founding_creator_applications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Post-generation feedback (1–5 stars per project)
create table if not exists public.project_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.cinematic_projects(id) on delete set null,
  rating     smallint not null check (rating >= 1 and rating <= 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index if not exists project_feedback_user_idx
  on public.project_feedback (user_id, created_at desc);

create index if not exists project_feedback_rating_idx
  on public.project_feedback (rating, created_at desc);

alter table public.project_feedback enable row level security;

drop policy if exists project_feedback_insert_self on public.project_feedback;
create policy project_feedback_insert_self on public.project_feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists project_feedback_select_self on public.project_feedback;
create policy project_feedback_select_self on public.project_feedback
  for select to authenticated
  using (auth.uid() = user_id);

comment on table public.founding_creator_applications is 'Founding Creator Beta Program applications (one row per user).';
comment on table public.project_feedback is 'Post-generation usefulness feedback (1–5 stars, once per project).';
