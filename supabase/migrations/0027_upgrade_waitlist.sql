-- Phase 4 — Monetization validation: upgrade interest waitlist (no Stripe yet).
-- Idempotent — safe to re-run.

create table if not exists public.upgrade_waitlist (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  email         text not null,
  plan_interest text not null check (plan_interest in ('free', 'creator', 'pro')),
  created_at    timestamptz not null default now(),
  unique (email, plan_interest)
);

create index if not exists upgrade_waitlist_created_idx
  on public.upgrade_waitlist (created_at desc);

create index if not exists upgrade_waitlist_plan_idx
  on public.upgrade_waitlist (plan_interest, created_at desc);

alter table public.upgrade_waitlist enable row level security;

-- Inserts go through the API (service role). Users may read their own rows.
drop policy if exists upgrade_waitlist_select_self on public.upgrade_waitlist;
create policy upgrade_waitlist_select_self on public.upgrade_waitlist
  for select to authenticated
  using (user_id is not null and auth.uid() = user_id);

comment on table public.upgrade_waitlist is 'Phase 4 upgrade waitlist — name, email, plan interest before billing launch.';
