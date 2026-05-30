-- Phase 8 — Early revenue validation (no Stripe). Idempotent.

create table if not exists public.revenue_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null check (
    event_type in (
      'pricing_page_visits',
      'upgrade_clicks',
      'plan_interest',
      'payment_attempts'
    )
  ),
  plan_interest text check (plan_interest is null or plan_interest in ('free', 'creator', 'pro')),
  user_id       uuid references auth.users(id) on delete set null,
  session_id    text,
  source        text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists revenue_events_type_created_idx
  on public.revenue_events (event_type, created_at desc);

create index if not exists revenue_events_plan_created_idx
  on public.revenue_events (plan_interest, created_at desc)
  where plan_interest is not null;

alter table public.revenue_events enable row level security;

-- Inserts via API (service role). No client SELECT.
drop policy if exists revenue_events_insert on public.revenue_events;
create policy revenue_events_insert on public.revenue_events
  for insert to authenticated, anon
  with check (true);

comment on table public.revenue_events is 'Phase 8 revenue validation — pricing visits, upgrade clicks, plan interest, payment attempts (waitlist / upgrade CTA).';
