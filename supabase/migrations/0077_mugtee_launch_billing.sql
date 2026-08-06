-- Mugtee Launch — billing schema, plan types, monthly usage reset

-- Subscriptions (Razorpay) — idempotent if already applied from migrations/0001_billing.sql
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free','creator','agency','pro')) default 'free',
  status text not null check (status in ('none','pending','active','cancelled','expired','past_due','halted')) default 'none',
  razorpay_subscription_id text,
  razorpay_customer_id text,
  razorpay_plan_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount integer,
  currency text default 'INR',
  current_period_start timestamptz,
  current_period_end timestamptz,
  ends_at timestamptz,
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_rzp_sub on public.subscriptions(razorpay_subscription_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

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

-- Expand plan_type constraint for paid tiers
alter table public.profiles drop constraint if exists profiles_plan_type_check;
alter table public.profiles add constraint profiles_plan_type_check
  check (plan_type in ('FREE', 'PRO_TRIAL', 'PRO', 'CREATOR', 'STUDIO', 'AGENCY'));

-- Monthly usage reset anchor (UTC month boundary)
alter table public.profiles
  add column if not exists usage_period_start timestamptz default date_trunc('month', now());

create index if not exists profiles_usage_period_idx on public.profiles (usage_period_start);

-- Billing history audit log
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('razorpay', 'stripe')),
  event_type text not null,
  plan text,
  amount integer,
  currency text default 'INR',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_user_created_idx
  on public.billing_events (user_id, created_at desc);

alter table public.billing_events enable row level security;

create policy "billing_events self read" on public.billing_events
  for select using (auth.uid() = user_id);
