-- Mugtee V5 Creator Multiverse — HQ evolution, worlds, reputation, story vault, sidekick evolution.

alter table public.creator_profiles
  add column if not exists creator_world text
    check (creator_world is null or creator_world in (
      'documentary', 'cinema', 'business', 'history', 'luxury', 'education', 'motivation'
    )),
  add column if not exists creator_reputation jsonb not null default '{
    "consistency": 0,
    "quality": 0,
    "publishing": 0,
    "engagement": 0,
    "learning": 0,
    "rank": "beginner"
  }'::jsonb,
  add column if not exists creator_hq_level int not null default 1
    check (creator_hq_level >= 1 and creator_hq_level <= 100),
  add column if not exists sidekick_personality jsonb not null default '{
    "preset": "wise_mentor",
    "voice": "warm",
    "humour": "light",
    "relationshipStyle": "collaborative"
  }'::jsonb,
  add column if not exists sidekick_evolution_tier int not null default 1
    check (sidekick_evolution_tier >= 1 and sidekick_evolution_tier <= 10),
  add column if not exists legendary_projects jsonb not null default '[]'::jsonb,
  add column if not exists story_vault_entries jsonb not null default '[]'::jsonb,
  add column if not exists hall_of_fame jsonb not null default '{}'::jsonb;

comment on column public.creator_profiles.creator_world is
  'Creator multiverse world: documentary|cinema|business|history|luxury|education|motivation';
comment on column public.creator_profiles.creator_reputation is
  'Reputation scores + rank derived from activity signals';
comment on column public.creator_profiles.creator_hq_level is
  'HQ visual tier 1–100 derived from creator XP';
comment on column public.creator_profiles.sidekick_personality is
  'Sidekick voice/humour/relationship preset affecting commentary tone';
comment on column public.creator_profiles.sidekick_evolution_tier is
  'Sidekick evolution tier 1–10 derived from creator level';
comment on column public.creator_profiles.legendary_projects is
  'Exceptional project refs: [{ projectId, title, score, exportedAt }]';
comment on column public.creator_profiles.story_vault_entries is
  'Cached timeline entries from projects + memory';
comment on column public.creator_profiles.hall_of_fame is
  'Best scripts, scores, streaks cache for multiverse home';
