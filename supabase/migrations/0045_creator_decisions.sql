-- Creator Decision Engine — decision history on profiles + event tuning

alter table public.creator_profiles
  add column if not exists decision_history jsonb not null default '[]'::jsonb;

comment on column public.creator_profiles.decision_history is
  'Recent decision_shown / decision_accepted entries for tuning (max ~40 in app)';
