-- Phase 3.5 — Creator Referral Program

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referral_bonus_generations integer not null default 0,
  add column if not exists referral_creator_plan_bonus boolean not null default false,
  add column if not exists referral_invites_sent integer not null default 0;

comment on column public.profiles.referral_code is 'Unique invite code for mugtee.in/invite/{code}.';
comment on column public.profiles.referral_bonus_generations is 'Extra generation cap from referral milestones.';
comment on column public.profiles.referral_creator_plan_bonus is 'Unlocked at 10 successful referrals (extended limits).';
comment on column public.profiles.referral_invites_sent is 'Referral link visits / share clicks.';

create table if not exists public.referrals (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references auth.users(id) on delete cascade,
  invitee_id      uuid not null unique references auth.users(id) on delete cascade,
  code            text not null,
  reward_granted  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_code_idx on public.referrals (code);

alter table public.referrals enable row level security;

drop policy if exists "referrals referrer read" on public.referrals;
create policy "referrals referrer read"
  on public.referrals for select
  using (auth.uid() = referrer_id);
