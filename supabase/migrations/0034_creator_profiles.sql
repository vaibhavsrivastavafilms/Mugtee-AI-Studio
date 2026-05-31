-- Mugtee Creator Sidekick Foundation Phase 1 — dedicated creator identity table.
-- Separate from projects; one row per user. Syncs with profiles.creator_profile JSONB for legacy reads.

create table if not exists public.creator_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  creator_name      text,
  platform          text,
  niche             text,
  creator_goal      text,
  content_style     text,
  experience_level  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists creator_profiles_user_id_idx on public.creator_profiles (user_id);

alter table public.creator_profiles enable row level security;

drop policy if exists "creator_profiles self read" on public.creator_profiles;
create policy "creator_profiles self read"
  on public.creator_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "creator_profiles self insert" on public.creator_profiles;
create policy "creator_profiles self insert"
  on public.creator_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "creator_profiles self update" on public.creator_profiles;
create policy "creator_profiles self update"
  on public.creator_profiles for update
  using (auth.uid() = user_id);

create or replace function public.touch_creator_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists creator_profiles_touch on public.creator_profiles;
create trigger creator_profiles_touch before update on public.creator_profiles
  for each row execute function public.touch_creator_profiles_updated_at();

-- Backfill from existing profiles.creator_profile JSONB (0023).
insert into public.creator_profiles (
  user_id,
  creator_name,
  platform,
  niche,
  creator_goal,
  content_style,
  experience_level
)
select
  p.id,
  nullif(trim(p.creator_profile->>'creatorName'), ''),
  nullif(trim(p.creator_profile->>'primaryPlatform'), ''),
  nullif(trim(p.creator_profile->>'niche'), ''),
  nullif(trim(p.creator_profile->>'creatorGoal'), ''),
  nullif(trim(p.creator_profile->>'contentStyle'), ''),
  nullif(trim(p.creator_profile->>'experience'), '')
from public.profiles p
where p.creator_profile is not null
  and p.creator_profile <> '{}'::jsonb
  and (
    coalesce(p.creator_profile->>'creatorName', '') <> ''
    or coalesce(p.creator_profile->>'primaryPlatform', '') <> ''
    or coalesce(p.creator_profile->>'niche', '') <> ''
    or coalesce(p.creator_profile->>'creatorGoal', '') <> ''
    or coalesce(p.creator_profile->>'contentStyle', '') <> ''
    or coalesce(p.creator_profile->>'experience', '') <> ''
  )
on conflict (user_id) do update set
  creator_name     = coalesce(excluded.creator_name, creator_profiles.creator_name),
  platform         = coalesce(excluded.platform, creator_profiles.platform),
  niche            = coalesce(excluded.niche, creator_profiles.niche),
  creator_goal     = coalesce(excluded.creator_goal, creator_profiles.creator_goal),
  content_style    = coalesce(excluded.content_style, creator_profiles.content_style),
  experience_level = coalesce(excluded.experience_level, creator_profiles.experience_level),
  updated_at       = now();

comment on table public.creator_profiles is
  'Creator Sidekick identity — name, platform, niche, goal, style, experience; source of truth for Phase 1.';
