-- Phase 2.3 — Creator Memory Profile on user profiles row.
-- JSON document: creatorName, primaryPlatform, contentStyle, tone, audience, channelDescription.

alter table public.profiles
  add column if not exists creator_profile jsonb not null default '{}'::jsonb;

comment on column public.profiles.creator_profile is
  'Creator Memory Profile — persistent voice/platform/style context for AI generation.';
