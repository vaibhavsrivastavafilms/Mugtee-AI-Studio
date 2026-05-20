-- Phase — Sponsor click tracking + affiliate analytics.
-- Minimal table: one row per click. `rewarded=true` only for the first click per user+sponsor per UTC day.
-- RLS: users can read their own rows; the server (with cookie session) inserts on their behalf.

create table if not exists public.sponsor_clicks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  sponsor       text not null,
  rewarded      boolean not null default false,
  credits_given integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists sponsor_clicks_user_day_idx
  on public.sponsor_clicks (user_id, sponsor, ((created_at at time zone 'utc')::date));

create index if not exists sponsor_clicks_sponsor_idx
  on public.sponsor_clicks (sponsor, created_at desc);

alter table public.sponsor_clicks enable row level security;

drop policy if exists "sponsor_clicks self read" on public.sponsor_clicks;
create policy "sponsor_clicks self read"
  on public.sponsor_clicks for select
  using (auth.uid() = user_id);

drop policy if exists "sponsor_clicks self insert" on public.sponsor_clicks;
create policy "sponsor_clicks self insert"
  on public.sponsor_clicks for insert
  with check (auth.uid() = user_id);
