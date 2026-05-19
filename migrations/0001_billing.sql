-- Phase P2 — Razorpay Billing MVP
-- Run this ONCE in your Supabase SQL editor.
-- Single-source-of-truth for a user's current subscription. One row per user.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free','creator','agency')) default 'free',
  status text not null check (status in ('none','pending','active','cancelled','expired','past_due')) default 'none',
  razorpay_subscription_id text,
  razorpay_customer_id text,
  razorpay_plan_id text,
  amount integer,            -- in paise
  currency text default 'INR',
  current_period_start timestamptz,
  current_period_end   timestamptz,
  ends_at timestamptz,
  raw jsonb,                 -- last seen Razorpay payload for debugging
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_rzp_sub on public.subscriptions(razorpay_subscription_id);
create index if not exists idx_subscriptions_status   on public.subscriptions(status);

-- Updated_at trigger
create or replace function public.tg_subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.tg_subscriptions_set_updated_at();

-- Row-level security: users see + manage only their own row
alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_self on public.subscriptions;
create policy subscriptions_select_self on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists subscriptions_insert_self on public.subscriptions;
create policy subscriptions_insert_self on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists subscriptions_update_self on public.subscriptions;
create policy subscriptions_update_self on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
