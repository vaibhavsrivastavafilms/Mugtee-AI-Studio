-- =============================================================
-- MUGTEE V4.0 — Lightweight Analytics Events Table
--
-- Single thin table for product analytics + visitor tracking. Dual-writes from
-- the client (PostHog optional, this table always) so we have first-party data
-- even when no PostHog key is configured.
--
-- DESIGN: anon-insertable (we need to log unauthenticated visitor events such as
-- `visitor_opened_site`, `pricing_opened`, `agency_demo_clicked`). user_id is
-- nullable for those. Reads are admin-only via a service-role API endpoint —
-- normal authenticated users CANNOT scrape the table.
--
-- IDEMPOTENT — safe to re-run.
-- =============================================================
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text,
  event_type  text not null,
  metadata    jsonb not null default '{}'::jsonb,
  url         text,
  referrer    text,
  device      text,
  country     text,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_event_idx on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_user_idx  on public.analytics_events (user_id, created_at desc) where user_id is not null;
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at desc) where session_id is not null;

alter table public.analytics_events enable row level security;

-- Anyone (anon + auth) can insert events — we don’t want to drop visitor signals.
drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert on public.analytics_events
  for insert to anon, authenticated with check (true);

-- Nobody can read the raw table from the client. Reads happen via the service-role
-- API endpoint /api/analytics/summary, which gates by ADMIN_USER_IDS env var.
drop policy if exists analytics_events_select on public.analytics_events;
create policy analytics_events_select on public.analytics_events
  for select to authenticated using (false);
