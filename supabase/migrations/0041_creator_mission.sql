-- Mugtee V3 Generation Mission System — XP, streaks, achievements, daily quests on creator_profiles.

alter table public.creator_profiles
  add column if not exists creator_xp int not null default 0,
  add column if not exists creator_level int not null default 1,
  add column if not exists mission_streak jsonb not null default '{"count":0,"lastDate":null}'::jsonb,
  add column if not exists achievements jsonb not null default '[]'::jsonb,
  add column if not exists daily_quests jsonb not null default '{}'::jsonb,
  add column if not exists last_active_date date,
  add column if not exists mission_stats jsonb not null default '{"scriptsCompleted":0,"hooksCompleted":0,"videosCompleted":0,"bestStoryScore":0}'::jsonb;

comment on column public.creator_profiles.creator_xp is 'Total creator XP from mission milestones.';
comment on column public.creator_profiles.creator_level is 'Creator level derived from XP (1–50).';
comment on column public.creator_profiles.mission_streak is 'Consecutive active days: { count, lastDate }.';
comment on column public.creator_profiles.achievements is 'Unlocked achievement IDs array.';
comment on column public.creator_profiles.daily_quests is 'Daily quest progress keyed by quest id.';
comment on column public.creator_profiles.mission_stats is 'Lifetime counters for achievements and quests.';
