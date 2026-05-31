-- Mugtee Vision 2.0 — Creator identity for Sidekick.
-- Stored on profiles.creator_profile (jsonb, see 0023_creator_profile.sql).
-- Fields: creatorName, primaryPlatform, niche, creatorGoal, contentStyle, experience, tone, audience, channelDescription

create index if not exists profiles_creator_profile_gin
  on public.profiles using gin (creator_profile);

comment on column public.profiles.creator_profile is
  'Creator Sidekick profile — name, platform, niche, goal, style, experience; injected into generation.';
