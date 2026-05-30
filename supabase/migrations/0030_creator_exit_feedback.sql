-- Phase 10 — Creator Exit Intelligence (exit feedback on churn signals)
-- Idempotent — safe to re-run.

create table if not exists public.creator_exit_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  trigger      text not null,
  reason       text not null,
  comment      text,
  creator_type text,
  created_at   timestamptz not null default now()
);

create index if not exists creator_exit_feedback_created_idx
  on public.creator_exit_feedback (created_at desc);

create index if not exists creator_exit_feedback_reason_idx
  on public.creator_exit_feedback (reason, created_at desc);

create index if not exists creator_exit_feedback_trigger_idx
  on public.creator_exit_feedback (trigger, created_at desc);

alter table public.creator_exit_feedback enable row level security;

drop policy if exists creator_exit_feedback_insert_self on public.creator_exit_feedback;
create policy creator_exit_feedback_insert_self on public.creator_exit_feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists creator_exit_feedback_select_self on public.creator_exit_feedback;
create policy creator_exit_feedback_select_self on public.creator_exit_feedback
  for select to authenticated
  using (auth.uid() = user_id);

comment on table public.creator_exit_feedback is 'Exit-intent feedback when users hit limits, leave pricing, export, or churn.';
