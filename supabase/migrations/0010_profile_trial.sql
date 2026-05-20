-- Phase V1.1 — 7-day Pro trial on first Google login.
-- Single lightweight profiles table. ONLY 4 trial fields. RLS scoped to auth.uid().

create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  plan_type          text not null default 'FREE' check (plan_type in ('FREE', 'PRO_TRIAL', 'PRO')),
  trial_started_at   timestamptz,
  trial_ends_at      timestamptz,
  trial_claimed      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists profiles_plan_idx on public.profiles (plan_type);
create index if not exists profiles_trial_ends_idx on public.profiles (trial_ends_at) where trial_ends_at is not null;

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-touch updated_at on update
create or replace function public.touch_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();
