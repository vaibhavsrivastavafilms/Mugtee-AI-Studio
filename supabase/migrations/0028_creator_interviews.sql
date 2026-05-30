-- Phase 5 — Growth Engine: creator interview fields on founding applications.
-- Idempotent — safe to re-run.

alter table public.founding_creator_applications
  add column if not exists pain_points text,
  add column if not exists requested_features text,
  add column if not exists feedback text;

comment on column public.founding_creator_applications.pain_points is
  'Optional creator pain points captured during founding program or interview.';
comment on column public.founding_creator_applications.requested_features is
  'Optional comma-separated or free-text feature requests from founding creators.';
comment on column public.founding_creator_applications.feedback is
  'Optional qualitative feedback from founder interviews or onboarding.';
